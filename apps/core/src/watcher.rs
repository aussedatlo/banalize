use crate::config::Config;
use crate::database::SledDatabase;
use crate::events::{Event, EventEmitter};
use crate::firewall::Firewall;
use crate::ip_extract::extract_ip;
use ipnet::IpNet;
use linemux::MuxedLines;
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info, warn};

pub struct Watcher {
    config: Config,
    sled_db: Arc<SledDatabase>,
    event_emitter: Arc<EventEmitter>,
    firewall: Arc<RwLock<Firewall>>,
    ignore_nets: Vec<IpNet>,
}

impl Watcher {
    pub fn new(
        config: Config,
        sled_db: Arc<SledDatabase>,
        event_emitter: Arc<EventEmitter>,
        firewall: Arc<RwLock<Firewall>>,
    ) -> Result<Self, String> {
        // Parse ignore_ips into IpNet
        let mut ignore_nets = Vec::new();
        for ip_str in &config.ignore_ips {
            match ip_str.parse::<IpNet>() {
                Ok(net) => ignore_nets.push(net),
                Err(_) => {
                    // Try as single IP
                    match ip_str.parse::<IpAddr>() {
                        Ok(ip) => {
                            // Convert to /32 network
                            if let Ok(net) = format!("{}/32", ip).parse::<IpNet>() {
                                ignore_nets.push(net);
                            }
                        }
                        Err(e) => {
                            warn!("Invalid ignore IP/CIDR: {} - {}", ip_str, e);
                        }
                    }
                }
            }
        }

        Ok(Self {
            config,
            sled_db,
            event_emitter,
            firewall,
            ignore_nets,
        })
    }

    pub async fn run(&self, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
        info!("Starting watcher for config: {} (file: {})", self.config.id, self.config.param);

        let mut lines = match MuxedLines::new() {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to create MuxedLines: {}", e);
                return;
            }
        };

        // Add the file to watch
        match lines.add_file(&self.config.param).await {
            Ok(_) => {
                info!("Watching file: {}", self.config.param);
            }
            Err(e) => {
                error!("Failed to add file {}: {}", self.config.param, e);
                return;
            }
        }

        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    info!("Watcher {} received shutdown signal", self.config.id);
                    break;
                }
                result = lines.next_line() => {
                    match result {
                        Ok(Some(line)) => {
                            if let Err(e) = self.handle_line(line.line()).await {
                                error!("Error handling line: {}", e);
                            }
                        }
                        Ok(None) => {
                            // EOF or no more lines
                            continue;
                        }
                        Err(e) => {
                            error!("Error reading line: {}", e);
                        }
                    }
                }
            }
        }

        info!("Watcher {} stopped", self.config.id);
    }

    async fn handle_line(&self, line: &str) -> Result<(), String> {
        // Extract IP from line using regex
        let ip = match extract_ip(&self.config.regex, line) {
            Some(ip) => ip,
            None => return Ok(()), // No IP found, skip
        };

        // Check if IP should be ignored
        if self.should_ignore_ip(&ip) {
            return Ok(());
        }

        // Get current timestamp in milliseconds
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        // Add match to sled (critical path)
        if let Err(e) = self.sled_db.add_match(&self.config.id, &ip, timestamp) {
            error!("Failed to add match to sled: {}", e);
            return Err(format!("Failed to add match: {}", e));
        }

        // Emit match event (async, non-blocking)
        self.event_emitter
            .emit(Event::Match {
                config_id: self.config.id.clone(),
                ip: ip.to_string(),
                timestamp,
            })
            .await;

        // Check if we need to ban
        match self
            .sled_db
            .get_matches_for_config(&self.config.id)
        {
            Ok(matches) => {
                if matches.len() >= self.config.max_matches as usize {
                    // Check if already banned
                    match self.sled_db.is_banned(&self.config.id, &ip) {
                        Ok(true) => {
                            // Already banned, skip
                            return Ok(());
                        }
                        Ok(false) => {
                            // Need to ban
                            if let Err(e) = self.ban_ip(&ip, timestamp).await {
                                error!("Failed to ban IP {}: {}", ip, e);
                                // Continue anyway, don't block critical path
                            }
                        }
                        Err(e) => {
                            error!("Failed to check ban status: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                error!("Failed to count matches: {}", e);
            }
        }

        Ok(())
    }

    async fn ban_ip(&self, ip: &IpAddr, timestamp: u64) -> Result<(), String> {
        info!("Banning IP {} for config {}", ip, self.config.id);

        // Add ban to sled (critical path)
        if let Err(e) = self.sled_db.add_ban(&self.config.id, ip, timestamp) {
            error!("Failed to add ban to sled: {}", e);
            return Err(format!("Failed to add ban: {}", e));
        }

        // Call firewall (synchronous, blocking, but in critical path)
        let firewall = self.firewall.read().await;
        if let Err(e) = firewall.deny_ip_sync(ip) {
            // According to spec: firewall error: do nothing
            warn!("Firewall error (ignored): {}", e);
        }

        // Emit ban event (async, non-blocking)
        self.event_emitter
            .emit(Event::Ban {
                config_id: self.config.id.clone(),
                ip: ip.to_string(),
                timestamp,
            })
            .await;

        Ok(())
    }

    fn should_ignore_ip(&self, ip: &IpAddr) -> bool {
        for net in &self.ignore_nets {
            if net.contains(ip) {
                return true;
            }
        }
        false
    }
}

