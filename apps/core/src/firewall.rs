use std::process::Command;
use tracing::{info, warn};

const IPTABLES_CHAIN: &str = "banalize";
const DEFAULT_LINK_CHAIN: &str = "INPUT";

pub struct Firewall {
    chain: String,
    link_chain: String,
    banned_ips: std::collections::HashSet<String>,
}

impl Firewall {
    pub fn new() -> Self {
        let link_chain = std::env::var("BANALIZE_CORE_API_FIREWALL_CHAIN")
            .unwrap_or_else(|_| DEFAULT_LINK_CHAIN.to_string());
        
        Self {
            chain: IPTABLES_CHAIN.to_string(),
            link_chain,
            banned_ips: std::collections::HashSet::new(),
        }
    }

    /// Initialize firewall: create chain, link it, and flush it
    pub fn init(&self) -> anyhow::Result<()> {
        info!("Initializing firewall");
        
        self.create_chain()?;
        self.link_chain()?;
        self.flush_chain()?;
        
        info!("Firewall initialized successfully");
        Ok(())
    }

    /// Create the iptables chain (ignores error if chain already exists)
    fn create_chain(&self) -> anyhow::Result<()> {
        let command = format!("iptables -N {}", self.chain);
        match self.execute_command_sync(&command) {
            Ok(_) => {
                info!("Created iptables chain: {}", self.chain);
                Ok(())
            }
            Err(e) => {
                // Chain might already exist, check if it's actually there
                let check_command = format!("iptables -L {} -n", self.chain);
                if self.execute_command_sync(&check_command).is_ok() {
                    info!("Iptables chain {} already exists", self.chain);
                    Ok(())
                } else {
                    Err(anyhow::anyhow!("Failed to create chain: {}", e))
                }
            }
        }
    }

    /// Link the chain to the link chain (e.g., INPUT)
    /// Ignores error if already linked (will fail silently if link already exists)
    fn link_chain(&self) -> anyhow::Result<()> {
        let command = format!("iptables -I {} -j {}", self.link_chain, self.chain);
        match self.execute_command_sync(&command) {
            Ok(_) => {
                info!("Linked chain {} to {}", self.chain, self.link_chain);
                Ok(())
            }
            Err(e) => {
                // Link might already exist, that's okay
                warn!("Could not link chain (might already be linked): {}", e);
                info!("Chain {} should be linked to {}", self.chain, self.link_chain);
                Ok(())
            }
        }
    }

    /// Flush the chain (remove all rules)
    fn flush_chain(&self) -> anyhow::Result<()> {
        let command = format!("iptables -F {}", self.chain);
        self.execute_command_sync(&command)
            .map_err(|e| anyhow::anyhow!("Failed to flush chain: {}", e))?;
        info!("Flushed iptables chain: {}", self.chain);
        Ok(())
    }

    /// Unlink the chain from the link chain
    pub fn unlink_chain(&self) -> anyhow::Result<()> {
        let command = format!("iptables -D {} -j {}", self.link_chain, self.chain);
        match self.execute_command_sync(&command) {
            Ok(_) => {
                info!("Unlinked chain {} from {}", self.chain, self.link_chain);
                Ok(())
            }
            Err(e) => {
                // Link might not exist, that's okay
                warn!("Could not unlink chain (might not be linked): {}", e);
                Ok(())
            }
        }
    }

    /// Delete the chain
    pub fn delete_chain(&self) -> anyhow::Result<()> {
        let command = format!("iptables -X {}", self.chain);
        match self.execute_command_sync(&command) {
            Ok(_) => {
                info!("Deleted iptables chain: {}", self.chain);
                Ok(())
            }
            Err(e) => {
                // Chain might not exist, that's okay
                warn!("Could not delete chain (might not exist): {}", e);
                Ok(())
            }
        }
    }

    /// Cleanup firewall: flush, unlink, and delete chain
    pub fn cleanup(&self) -> anyhow::Result<()> {
        info!("Cleaning up firewall rules");
        self.flush_chain()?;
        self.unlink_chain()?;
        self.delete_chain()?;
        info!("Firewall rules cleaned up");
        Ok(())
    }

    /// Restore bans from a list of IPs
    pub fn restore_bans(&mut self, ips: &[String]) -> anyhow::Result<()> {
        if ips.is_empty() {
            info!("No bans to restore");
            return Ok(());
        }

        info!("Restoring {} ban(s): {}", ips.len(), ips.join(", "));
        for ip in ips {
            if let Err(e) = self.deny_ip_sync(ip) {
                warn!("Failed to restore ban for IP {}: {}", ip, e);
            }
        }
        Ok(())
    }

    /// Build iptables command to deny an IP
    fn build_deny_command(&self, ip: &str) -> String {
        format!(
            "iptables -A {} -s {}/32 -j REJECT --reject-with icmp-port-unreachable",
            self.chain, ip
        )
    }

    /// Build iptables command to allow an IP
    fn build_allow_command(&self, ip: &str) -> String {
        format!(
            "iptables -D {} -s {}/32 -j REJECT --reject-with icmp-port-unreachable",
            self.chain, ip
        )
    }

    /// Synchronous version for critical path (high-priority thread)
    pub fn deny_ip_sync(&mut self, ip: &str) -> anyhow::Result<()> {
        if self.banned_ips.contains(ip) {
            return Ok(());
        }

        let command = self.build_deny_command(ip);
        // Firewall errors should be ignored per spec
        if let Err(e) = self.execute_command_sync(&command) {
            warn!("Firewall error (ignored): {}", e);
        } else {
            self.banned_ips.insert(ip.to_string());
            info!("Banned IP: {}", ip);
        }
        Ok(())
    }

    /// Synchronous version for blocking operations
    pub fn allow_ip_sync(&mut self, ip: &str) -> anyhow::Result<()> {
        if !self.banned_ips.contains(ip) {
            return Ok(());
        }

        let command = self.build_allow_command(ip);
        // Firewall errors should be ignored per spec
        if let Err(e) = self.execute_command_sync(&command) {
            warn!("Firewall error (ignored): {}", e);
        } else {
            self.banned_ips.remove(ip);
            info!("Unbanned IP: {}", ip);
        }
        Ok(())
    }

    /// Execute iptables command synchronously
    fn execute_command_sync(&self, command: &str) -> anyhow::Result<()> {
        let output = Command::new("sh")
            .arg("-c")
            .arg(command)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(anyhow::anyhow!("Command failed: {}", stderr));
        }

        Ok(())
    }
}

impl Default for Firewall {
    fn default() -> Self {
        Self::new()
    }
}

