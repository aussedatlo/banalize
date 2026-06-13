use std::collections::{HashMap, VecDeque};
use std::net::IpAddr;
use std::sync::Mutex;

/// Authoritative in-memory runtime state for the ban pipeline.
///
/// SQLite remains the durable store, written asynchronously off the critical
/// path (via the event bus) and read by the API and by startup hydration. This
/// store is the hot path: every match count and ban check hits memory only.
///
/// TTL is applied lazily — match counting prunes the window on read, so a count
/// is always exact for the requested `find_time` regardless of sweep timing.
/// The periodic cleaner additionally drives ban expiry (which must be active,
/// since an expiring ban has to push an `Unban` out to the firewall).
#[derive(Default)]
pub struct MemoryStore {
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    /// config_id -> ip -> match timestamps (ascending). Counting is per
    /// (config, IP): one attacker's burst must never push an unrelated IP
    /// over the ban threshold.
    matches: HashMap<String, HashMap<IpAddr, VecDeque<u64>>>,
    /// config_id -> ip -> original ban timestamp.
    bans: HashMap<String, HashMap<IpAddr, u64>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Record a match for an IP under a config.
    pub fn add_match(&self, config_id: &str, ip: IpAddr, timestamp: u64) {
        let mut inner = self.inner.lock().unwrap();
        inner
            .matches
            .entry(config_id.to_string())
            .or_default()
            .entry(ip)
            .or_default()
            .push_back(timestamp);
    }

    /// Number of matches for one IP under a config at or after `cutoff`
    /// (now - find_time), pruning anything older as a side effect.
    pub fn count_matches(&self, config_id: &str, ip: &IpAddr, cutoff: u64) -> usize {
        let mut inner = self.inner.lock().unwrap();
        match inner
            .matches
            .get_mut(config_id)
            .and_then(|ips| ips.get_mut(ip))
        {
            Some(window) => {
                prune_front(window, cutoff);
                window.len()
            }
            None => 0,
        }
    }

    /// Drop matches older than `cutoff` to reclaim memory (cleaner sweep),
    /// removing IPs whose window emptied so quiet IPs don't accumulate.
    pub fn prune_matches(&self, config_id: &str, cutoff: u64) {
        let mut inner = self.inner.lock().unwrap();
        if let Some(ips) = inner.matches.get_mut(config_id) {
            for window in ips.values_mut() {
                prune_front(window, cutoff);
            }
            ips.retain(|_, window| !window.is_empty());
        }
    }

    /// Drop every match window for a config (config deletion: the cleaner
    /// only visits live configs, so these would otherwise leak).
    pub fn remove_matches(&self, config_id: &str) {
        let mut inner = self.inner.lock().unwrap();
        inner.matches.remove(config_id);
    }

    pub fn is_banned(&self, config_id: &str, ip: &IpAddr) -> bool {
        let inner = self.inner.lock().unwrap();
        inner
            .bans
            .get(config_id)
            .is_some_and(|ips| ips.contains_key(ip))
    }

    pub fn add_ban(&self, config_id: &str, ip: IpAddr, timestamp: u64) {
        let mut inner = self.inner.lock().unwrap();
        inner
            .bans
            .entry(config_id.to_string())
            .or_default()
            .insert(ip, timestamp);
    }

    /// Remove a single ban (e.g. API disable). Returns true if it existed.
    pub fn remove_ban(&self, config_id: &str, ip: &IpAddr) -> bool {
        let mut inner = self.inner.lock().unwrap();
        inner
            .bans
            .get_mut(config_id)
            .is_some_and(|ips| ips.remove(ip).is_some())
    }

    /// Remove and return every ban for a config whose timestamp is older than
    /// `cutoff` (now - ban_time). Used by the cleaner to drive expiry.
    pub fn take_expired_bans(&self, config_id: &str, cutoff: u64) -> Vec<IpAddr> {
        let mut inner = self.inner.lock().unwrap();
        let Some(ips) = inner.bans.get_mut(config_id) else {
            return Vec::new();
        };
        let expired: Vec<IpAddr> = ips
            .iter()
            .filter(|(_, &ts)| ts < cutoff)
            .map(|(ip, _)| *ip)
            .collect();
        for ip in &expired {
            ips.remove(ip);
        }
        expired
    }

    /// Remove and return every ban for a config, regardless of age. Used when
    /// a config is deleted so its bans are lifted rather than leaked (the
    /// cleaner only visits configs that still exist).
    pub fn take_all_bans(&self, config_id: &str) -> Vec<IpAddr> {
        let mut inner = self.inner.lock().unwrap();
        inner
            .bans
            .remove(config_id)
            .map(|ips| ips.into_keys().collect())
            .unwrap_or_default()
    }
}

/// Drop leading entries strictly older than `cutoff`. Assumes ascending order,
/// which holds because timestamps are appended in arrival order.
fn prune_front(window: &mut VecDeque<u64>, cutoff: u64) {
    while let Some(&front) = window.front() {
        if front < cutoff {
            window.pop_front();
        } else {
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn ip(s: &str) -> IpAddr {
        s.parse().unwrap()
    }

    #[test]
    fn counts_matches_within_window_and_prunes_old() {
        let store = MemoryStore::new();
        let a = ip("10.0.0.1");
        store.add_match("c", a, 1000);
        store.add_match("c", a, 1500);
        store.add_match("c", a, 3000);
        // cutoff 2000 drops the first two.
        assert_eq!(store.count_matches("c", &a, 2000), 1);
        // Pruning persisted: a later count at a lower cutoff still sees only 1.
        assert_eq!(store.count_matches("c", &a, 0), 1);
    }

    #[test]
    fn match_windows_are_isolated_per_ip() {
        let store = MemoryStore::new();
        let a = ip("10.0.0.1");
        let b = ip("10.0.0.2");
        store.add_match("c", a, 1000);
        store.add_match("c", a, 1100);
        store.add_match("c", b, 1200);
        // A's burst never inflates B's count, and vice versa.
        assert_eq!(store.count_matches("c", &a, 0), 2);
        assert_eq!(store.count_matches("c", &b, 0), 1);
    }

    #[test]
    fn prune_matches_drops_emptied_ips() {
        let store = MemoryStore::new();
        let a = ip("10.0.0.1");
        let b = ip("10.0.0.2");
        store.add_match("c", a, 1000);
        store.add_match("c", b, 5000);
        store.prune_matches("c", 2000);
        assert_eq!(store.count_matches("c", &a, 0), 0);
        assert_eq!(store.count_matches("c", &b, 0), 1);
    }

    #[test]
    fn remove_matches_clears_config() {
        let store = MemoryStore::new();
        let a = ip("10.0.0.1");
        store.add_match("c", a, 1000);
        store.remove_matches("c");
        assert_eq!(store.count_matches("c", &a, 0), 0);
    }

    #[test]
    fn ban_lifecycle() {
        let store = MemoryStore::new();
        assert!(!store.is_banned("c", &ip("10.0.0.1")));
        store.add_ban("c", ip("10.0.0.1"), 5000);
        assert!(store.is_banned("c", &ip("10.0.0.1")));
        assert!(store.remove_ban("c", &ip("10.0.0.1")));
        assert!(!store.is_banned("c", &ip("10.0.0.1")));
    }

    #[test]
    fn take_expired_bans_only_removes_old() {
        let store = MemoryStore::new();
        store.add_ban("c", ip("10.0.0.1"), 1000);
        store.add_ban("c", ip("10.0.0.2"), 9000);
        let expired = store.take_expired_bans("c", 5000);
        assert_eq!(expired, vec![ip("10.0.0.1")]);
        assert!(!store.is_banned("c", &ip("10.0.0.1")));
        assert!(store.is_banned("c", &ip("10.0.0.2")));
    }
}
