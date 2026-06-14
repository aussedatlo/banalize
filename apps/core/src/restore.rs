use crate::config::ConfigMap;
use crate::database::SqliteDatabase;
use crate::events::FirewallCommand;
use crate::store::MemoryStore;
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex, RwLock};
use tracing::{info, warn};

/// Hydrate the in-memory store from the durable SQLite log on startup, and
/// re-apply still-active firewall bans.
///
/// SQLite keeps an append-only audit of match/ban/unban events. We reconstruct
/// the live runtime state from it:
///   - active bans  = latest ban per IP, within `ban_time`, not undone by a
///     later unban — each is re-added to memory and re-denied in the firewall.
///   - match window = match events within `find_time`, repopulated so counting
///     continues seamlessly across a restart.
pub async fn restore_state(
    events_db: Arc<Mutex<SqliteDatabase>>,
    store: Arc<MemoryStore>,
    firewall_tx: mpsc::Sender<FirewallCommand>,
    configs: Arc<RwLock<ConfigMap>>,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("Restoring runtime state from database...");

    let configs_read = configs.read().await;
    let mut restored_bans = 0;
    let mut restored_matches = 0;

    for (config_id, config) in configs_read.iter() {
        let now = now_millis();
        let match_cutoff = now.saturating_sub(config.find_time);

        // Gather everything we need under a single lock, then release it before
        // awaiting on the firewall channel.
        let mut to_deny: Vec<IpAddr> = Vec::new();
        {
            let db = events_db.lock().await;

            // Active bans: latest ban vs latest unban per IP (events are DESC,
            // so the first timestamp seen for an IP is the most recent).
            let latest_unban = latest_per_ip(
                db.get_unban_events(Some(config_id))
                    .unwrap_or_default()
                    .into_iter()
                    .map(|e| (e.ip, e.timestamp)),
            );
            let ban_events = db.get_ban_events(Some(config_id)).unwrap_or_default();

            // Total bans ever seen per IP — this is the recidive history that
            // drives escalation, and it must survive a restart.
            let mut ban_counts: HashMap<String, u32> = HashMap::new();
            for e in &ban_events {
                *ban_counts.entry(e.ip.clone()).or_insert(0) += 1;
            }

            let latest_ban =
                latest_per_ip(ban_events.iter().map(|e| (e.ip.clone(), e.timestamp)));

            for (ip_str, &count) in &ban_counts {
                if let Ok(ip) = ip_str.parse::<IpAddr>() {
                    store.set_recidive(config_id, ip, count);
                }
            }

            for (ip_str, ban_ts) in latest_ban {
                // The latest ban is the `count`-th, so its effective duration
                // used the exponent `count - 1`. With the multiplicator off this
                // collapses to the flat `ban_time` (matching `ban_cutoff`).
                let prior = ban_counts.get(&ip_str).copied().unwrap_or(1).saturating_sub(1);
                let effective = config.effective_ban_time(prior);
                let expired = ban_ts.saturating_add(effective) <= now;
                let undone = latest_unban.get(&ip_str).is_some_and(|&u| u >= ban_ts);
                if expired || undone {
                    continue; // expired or already lifted
                }
                match ip_str.parse::<IpAddr>() {
                    Ok(ip) => {
                        store.add_ban_with_duration(config_id, ip, ban_ts, effective);
                        to_deny.push(ip);
                        restored_bans += 1;
                    }
                    Err(e) => warn!("Invalid IP in ban record {} ({}): {}", ip_str, config_id, e),
                }
            }

            // Match window: events are DESC, so stop at the first one older
            // than the window, then replay per IP in ascending order.
            let mut recent: Vec<(String, u64)> = Vec::new();
            for ev in db.get_match_events(Some(config_id)).unwrap_or_default() {
                if ev.timestamp < match_cutoff {
                    break;
                }
                recent.push((ev.ip, ev.timestamp));
            }
            for (ip_str, ts) in recent.into_iter().rev() {
                match ip_str.parse::<IpAddr>() {
                    Ok(ip) => {
                        store.add_match(config_id, ip, ts);
                        restored_matches += 1;
                    }
                    Err(e) => warn!("Invalid IP in match record {} ({}): {}", ip_str, config_id, e),
                }
            }
        }

        for ip in to_deny {
            let deny = FirewallCommand::Deny {
                config_id: config_id.clone(),
                ip,
            };
            if firewall_tx.send(deny).await.is_ok() {
                info!("Restored firewall ban for {} (config: {})", ip, config_id);
            } else {
                warn!("Firewall actor gone, could not restore ban for {}", ip);
            }
        }
    }

    info!(
        "Restored {} active bans and {} recent matches",
        restored_bans, restored_matches
    );
    Ok(())
}

/// Collapse `(ip, timestamp)` pairs to the maximum timestamp per IP.
fn latest_per_ip(events: impl Iterator<Item = (String, u64)>) -> HashMap<String, u64> {
    let mut latest: HashMap<String, u64> = HashMap::new();
    for (ip, ts) in events {
        latest
            .entry(ip)
            .and_modify(|cur| *cur = (*cur).max(ts))
            .or_insert(ts);
    }
    latest
}

fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}
