use iptables;
use std::net::IpAddr;
use tracing::{error, info, warn};

const TABLE: &str = "filter";
const CHAIN_NAME: &str = "banalize";

pub struct Firewall {
    ipt: iptables::IPTables,
    link_chain: String, // The chain to link to (e.g., INPUT, FORWARD)
}

impl Firewall {
    pub fn new(link_chain: String) -> Self {
        Self {
            ipt: iptables::new(false).expect("Failed to create iptables instance"),
            link_chain,
        }
    }

    /// Initialize the firewall: create chain, link chain, flush chain
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

        // Flush chain (clear existing rules)
        let flush_cmd = format!("-F {}", CHAIN_NAME);
        match self.ipt.execute(TABLE, &flush_cmd) {
            Ok(_) => info!("Flushed chain: {}", CHAIN_NAME),
            Err(e) => {
                warn!("Failed to flush chain (may be empty): {}", e);
            }
        }

        Ok(())
    }

    /// Cleanup: flush chain, unlink chain, delete chain
    pub fn cleanup(&mut self) -> Result<(), String> {
        info!("Cleaning up firewall chain: {}", CHAIN_NAME);

        // Flush chain
        let flush_cmd = format!("-F {}", CHAIN_NAME);
        if let Err(e) = self.ipt.execute(TABLE, &flush_cmd) {
            warn!("Failed to flush chain: {}", e);
        }

        // Unlink chain (remove jump rule)
        let rule = format!("-j {}", CHAIN_NAME);
        // Try to delete the rule
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

    /// Deny an IP address (synchronous, blocking)
    pub fn deny_ip_sync(&self, ip: &IpAddr) -> Result<(), String> {
        let rule = format!("-s {} -j DROP", ip);
        
        // Check if rule already exists
        if let Ok(exists) = self.ipt.exists(TABLE, CHAIN_NAME, &rule) {
            if exists {
                return Ok(()); // Rule already exists
            }
        }

        match self.ipt.append(TABLE, CHAIN_NAME, &rule) {
            Ok(_) => {
                info!("Added firewall rule to deny IP: {}", ip);
                Ok(())
            }
            Err(e) => {
                error!("Failed to add firewall rule for IP {}: {}", ip, e);
                Err(format!("Failed to deny IP: {}", e))
            }
        }
    }

    /// Remove a deny rule for an IP address
    pub fn allow_ip_sync(&self, ip: &IpAddr) -> Result<(), String> {
        let rule = format!("-s {} -j DROP", ip);
        
        match self.ipt.delete(TABLE, CHAIN_NAME, &rule) {
            Ok(_) => {
                info!("Removed firewall rule for IP: {}", ip);
                Ok(())
            }
            Err(e) => {
                warn!("Failed to remove firewall rule for IP {}: {}", ip, e);
                Err(format!("Failed to allow IP: {}", e))
            }
        }
    }
}
