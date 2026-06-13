use crate::events::FirewallCommand;
use std::collections::HashSet;
use std::net::IpAddr;
use tokio::sync::{broadcast, mpsc};
use tracing::{error, info, warn};

const TABLE: &str = "filter";
const CHAIN_NAME: &str = "banalize";
/// Prefix of per-config child chains, kept short so sanitized config ids fit
/// within the iptables chain-name limit.
const CHILD_PREFIX: &str = "bnz-";
/// iptables chain names are limited to 28 characters.
const MAX_CHAIN_LEN: usize = 28;

/// Deterministic iptables chain name for a config.
///
/// Clean short ids stay readable (`bnz-cfg-ssh`). Ids that need sanitizing or
/// truncation get an FNV-1a hash of the *original* id appended, so distinct
/// ids can never collide after sanitization ("cfg a" vs "cfg-a") and the name
/// is stable across restarts.
pub fn chain_name(config_id: &str) -> String {
    let sanitized: String = config_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.') {
                c
            } else {
                '-'
            }
        })
        .collect();

    let fits = CHILD_PREFIX.len() + sanitized.len() <= MAX_CHAIN_LEN;
    if fits && sanitized == config_id {
        return format!("{}{}", CHILD_PREFIX, sanitized);
    }

    let keep = MAX_CHAIN_LEN - CHILD_PREFIX.len() - 9; // room for "-XXXXXXXX"
    let prefix: String = sanitized.chars().take(keep).collect();
    format!("{}{}-{:08x}", CHILD_PREFIX, prefix, fnv1a32(config_id))
}

fn fnv1a32(input: &str) -> u32 {
    let mut hash: u32 = 0x811c9dc5;
    for byte in input.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    hash
}

pub struct Firewall {
    ipt: iptables::IPTables,
    link_chain: String, // The chain to link to (e.g., INPUT, FORWARD)
    /// Child chains created during this process lifetime. The actor is the
    /// single owner of iptables state, so this set is authoritative.
    chains: HashSet<String>,
}

impl Firewall {
    pub fn new(link_chain: String) -> Self {
        let ipt = match std::env::var("BANALIZE_IPTABLE_BIN") {
            Ok(bin_path) if !bin_path.is_empty() => {
                // Leak the string to produce a &'static str required by IPTables::cmd.
                // Acceptable since Firewall is created once per process lifetime.
                let leaked: &'static str = Box::leak(bin_path.into_boxed_str());
                iptables::IPTables {
                    cmd: leaked,
                    has_check: false, // use -S list check; fake binary returns empty → rule "not found"
                    has_wait: true,   // avoids lock file at /var/run/xtables_old.lock (requires root)
                    is_numeric: false,
                }
            }
            _ => iptables::new(false).expect("Failed to create iptables instance"),
        };
        Self {
            ipt,
            link_chain,
            chains: HashSet::new(),
        }
    }

    /// Initialize the firewall: create and link the parent chain, flush it
    /// (dropping any stale jumps to child chains), then sweep orphaned child
    /// chains left behind by a crashed run.
    pub fn init(&mut self) -> Result<(), String> {
        info!("Initializing firewall chain: {}", CHAIN_NAME);

        // Create chain (ignore error if it already exists)
        let create_cmd = format!("-N {}", CHAIN_NAME);
        match self.ipt.execute(TABLE, &create_cmd) {
            Ok(_) => info!("Created chain: {}", CHAIN_NAME),
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("already exists") || err_str.contains("File exists") {
                    info!("Chain {} already exists", CHAIN_NAME);
                } else {
                    warn!("Failed to create chain (may already exist): {}", e);
                }
            }
        }

        // Link chain (insert jump rule at the beginning)
        let rule = format!("-j {}", CHAIN_NAME);
        match self.ipt.insert_unique(TABLE, &self.link_chain, &rule, 1) {
            Ok(_) => info!("Linked chain {} to {}", CHAIN_NAME, self.link_chain),
            Err(e) => {
                // Check if rule already exists
                if let Ok(exists) = self.ipt.exists(TABLE, &self.link_chain, &rule) {
                    if exists {
                        info!("Chain {} already linked to {}", CHAIN_NAME, self.link_chain);
                    } else {
                        // Try append as fallback
                        if let Err(e2) = self.ipt.append(TABLE, &self.link_chain, &rule) {
                            return Err(format!("Failed to link chain: {} / {}", e, e2));
                        } else {
                            info!("Linked chain {} to {} (via append)", CHAIN_NAME, self.link_chain);
                        }
                    }
                } else {
                    return Err(format!("Failed to link chain: {}", e));
                }
            }
        }

        // Flush chain (clears existing rules, including jumps to child chains)
        let flush_cmd = format!("-F {}", CHAIN_NAME);
        match self.ipt.execute(TABLE, &flush_cmd) {
            Ok(_) => info!("Flushed chain: {}", CHAIN_NAME),
            Err(e) => {
                warn!("Failed to flush chain (may be empty): {}", e);
            }
        }

        // Orphan sweep: child chains from a crashed run are now unreferenced
        // (the parent flush above removed their jump rules) — delete them so
        // restore starts from a clean slate.
        if let Ok(existing) = self.ipt.list_chains(TABLE) {
            for chain in existing.iter().filter(|c| c.starts_with(CHILD_PREFIX)) {
                let _ = self.ipt.execute(TABLE, &format!("-F {}", chain));
                match self.ipt.execute(TABLE, &format!("-X {}", chain)) {
                    Ok(_) => info!("Swept orphaned chain: {}", chain),
                    Err(e) => warn!("Failed to sweep orphaned chain {}: {}", chain, e),
                }
            }
        }

        Ok(())
    }

    /// Cleanup: flush the parent (unreferencing the children), delete every
    /// child chain, then unlink and delete the parent.
    pub fn cleanup(&mut self) -> Result<(), String> {
        info!("Cleaning up firewall chain: {}", CHAIN_NAME);

        // Flush the parent first: a chain cannot be deleted while referenced.
        let flush_cmd = format!("-F {}", CHAIN_NAME);
        if let Err(e) = self.ipt.execute(TABLE, &flush_cmd) {
            warn!("Failed to flush chain: {}", e);
        }

        for chain in std::mem::take(&mut self.chains) {
            let _ = self.ipt.execute(TABLE, &format!("-F {}", chain));
            if let Err(e) = self.ipt.execute(TABLE, &format!("-X {}", chain)) {
                warn!("Failed to delete chain {}: {}", chain, e);
            }
        }

        // Unlink chain (remove jump rule)
        let rule = format!("-j {}", CHAIN_NAME);
        if let Err(e) = self.ipt.delete(TABLE, &self.link_chain, &rule) {
            warn!("Failed to unlink chain: {}", e);
        } else {
            info!("Unlinked chain {} from {}", CHAIN_NAME, self.link_chain);
        }

        // Delete chain
        let delete_cmd = format!("-X {}", CHAIN_NAME);
        match self.ipt.execute(TABLE, &delete_cmd) {
            Ok(_) => info!("Deleted chain: {}", CHAIN_NAME),
            Err(e) => {
                warn!("Failed to delete chain: {}", e);
            }
        }

        Ok(())
    }

    /// Create a config's child chain and link it from the parent, once per
    /// process lifetime. Tolerates pre-existing chains like the parent init.
    fn ensure_chain(&mut self, config_id: &str) -> String {
        let chain = chain_name(config_id);
        if self.chains.contains(&chain) {
            return chain;
        }

        match self.ipt.execute(TABLE, &format!("-N {}", chain)) {
            Ok(_) => info!("Created chain: {}", chain),
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("already exists") || err_str.contains("File exists") {
                    info!("Chain {} already exists", chain);
                } else {
                    warn!("Failed to create chain {} (may already exist): {}", chain, e);
                }
            }
        }

        let link = format!("-j {}", chain);
        let linked = matches!(self.ipt.exists(TABLE, CHAIN_NAME, &link), Ok(true));
        if !linked {
            if let Err(e) = self.ipt.append(TABLE, CHAIN_NAME, &link) {
                error!("Failed to link chain {} to {}: {}", chain, CHAIN_NAME, e);
            } else {
                info!("Linked chain {} to {}", chain, CHAIN_NAME);
            }
        }

        self.chains.insert(chain.clone());
        chain
    }

    /// Deny an IP address in a config's chain (synchronous, blocking)
    pub fn deny_ip_sync(&mut self, config_id: &str, ip: &IpAddr) -> Result<(), String> {
        let chain = self.ensure_chain(config_id);
        let rule = format!("-s {} -j DROP", ip);

        // Check if rule already exists
        if let Ok(exists) = self.ipt.exists(TABLE, &chain, &rule) {
            if exists {
                return Ok(()); // Rule already exists
            }
        }

        match self.ipt.append(TABLE, &chain, &rule) {
            Ok(_) => {
                info!("Added firewall rule to deny IP {} in {}", ip, chain);
                Ok(())
            }
            Err(e) => {
                error!("Failed to add firewall rule for IP {}: {}", ip, e);
                Err(format!("Failed to deny IP: {}", e))
            }
        }
    }

    /// Remove a deny rule for an IP address from a config's chain
    pub fn allow_ip_sync(&self, config_id: &str, ip: &IpAddr) -> Result<(), String> {
        let chain = chain_name(config_id);
        let rule = format!("-s {} -j DROP", ip);

        match self.ipt.delete(TABLE, &chain, &rule) {
            Ok(_) => {
                info!("Removed firewall rule for IP {} from {}", ip, chain);
                Ok(())
            }
            Err(e) => {
                warn!("Failed to remove firewall rule for IP {}: {}", ip, e);
                Err(format!("Failed to allow IP: {}", e))
            }
        }
    }

    /// Tear down a config's chain: flush it, unlink it from the parent and
    /// delete it. No-op if the chain was never created (config never banned).
    fn remove_chain_sync(&mut self, config_id: &str) {
        let chain = chain_name(config_id);
        if !self.chains.remove(&chain) {
            return;
        }

        let _ = self.ipt.execute(TABLE, &format!("-F {}", chain));
        if let Err(e) = self.ipt.delete(TABLE, CHAIN_NAME, &format!("-j {}", chain)) {
            warn!("Failed to unlink chain {}: {}", chain, e);
        }
        match self.ipt.execute(TABLE, &format!("-X {}", chain)) {
            Ok(_) => info!("Removed chain: {}", chain),
            Err(e) => warn!("Failed to delete chain {}: {}", chain, e),
        }
    }

    /// Run the firewall actor: the single owner of the iptables chains.
    ///
    /// All ban/unban mutations arrive as `FirewallCommand`s over a lossless
    /// mpsc channel, so a banned IP can never be silently dropped (unlike the
    /// lossy notification bus). On shutdown — or once every sender is gone —
    /// every chain is flushed, unlinked and deleted.
    pub async fn run(
        mut self,
        mut cmd_rx: mpsc::Receiver<FirewallCommand>,
        mut shutdown_rx: broadcast::Receiver<()>,
    ) {
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    info!("Firewall actor received shutdown signal");
                    break;
                }
                cmd = cmd_rx.recv() => {
                    match cmd {
                        Some(FirewallCommand::Deny { config_id, ip }) => {
                            // Errors are logged inside; firewall failures must
                            // never block detection.
                            let _ = self.deny_ip_sync(&config_id, &ip);
                        }
                        Some(FirewallCommand::Allow { config_id, ip }) => {
                            if let Err(e) = self.allow_ip_sync(&config_id, &ip) {
                                warn!("Failed to remove firewall rule for {}: {}", ip, e);
                            }
                        }
                        Some(FirewallCommand::RemoveChain { config_id }) => {
                            self.remove_chain_sync(&config_id);
                        }
                        None => {
                            info!("Firewall actor: all senders dropped, shutting down");
                            break;
                        }
                    }
                }
            }
        }

        if let Err(e) = self.cleanup() {
            warn!("Firewall cleanup error: {}", e);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_short_ids_pass_through() {
        assert_eq!(chain_name("cfg-ssh"), "bnz-cfg-ssh");
        assert_eq!(chain_name("nginx_404.v2"), "bnz-nginx_404.v2");
    }

    #[test]
    fn sanitized_ids_get_a_hash_suffix() {
        let name = chain_name("cfg a");
        assert!(name.starts_with("bnz-cfg-a-"), "{}", name);
        assert!(name.len() <= MAX_CHAIN_LEN);
        // Distinct ids that sanitize identically must not collide.
        assert_ne!(chain_name("cfg a"), chain_name("cfg-a"));
        assert_ne!(chain_name("cfg a"), chain_name("cfg.a"));
    }

    #[test]
    fn long_ids_are_truncated_with_hash() {
        let long = "a-very-long-config-identifier-beyond-the-limit";
        let name = chain_name(long);
        assert!(name.len() <= MAX_CHAIN_LEN, "{}", name);
        assert_ne!(name, chain_name(&long[..long.len() - 1]));
    }

    #[test]
    fn chain_names_are_deterministic() {
        assert_eq!(chain_name("héllo wörld"), chain_name("héllo wörld"));
    }
}
