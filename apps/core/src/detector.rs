use crate::config::Config;
use crate::events::{Event, EventEmitter, FirewallCommand};
use crate::ip_extract::extract_ip;
use crate::store::MemoryStore;
use ipnet::IpNet;
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc};
use tracing::{error, info, warn};

/// Owns the ban policy for a single config: regex extraction, ignore-list
/// filtering, match recording, threshold counting and the ban decision.
///
/// It consumes raw lines from a tailer over an mpsc channel (lossless work
/// path) and drives side effects out: match/ban events onto the notification
/// bus, and `Deny` commands to the firewall actor.
pub struct Detector {
    config: Config,
    store: Arc<MemoryStore>,
    event_emitter: Arc<EventEmitter>,
    firewall_tx: mpsc::Sender<FirewallCommand>,
    ignore_nets: Vec<IpNet>,
}

impl Detector {
    pub fn new(
        config: Config,
        store: Arc<MemoryStore>,
        event_emitter: Arc<EventEmitter>,
        firewall_tx: mpsc::Sender<FirewallCommand>,
    ) -> Result<Self, String> {
        // Parse ignore_ips into IpNet (single IPs become /32 networks).
        let mut ignore_nets = Vec::new();
        for ip_str in &config.ignore_ips {
            match ip_str.parse::<IpNet>() {
                Ok(net) => ignore_nets.push(net),
                Err(_) => match ip_str.parse::<IpAddr>() {
                    Ok(ip) => {
                        if let Ok(net) = format!("{}/32", ip).parse::<IpNet>() {
                            ignore_nets.push(net);
                        }
                    }
                    Err(e) => {
                        warn!("Invalid ignore IP/CIDR: {} - {}", ip_str, e);
                    }
                },
            }
        }

        Ok(Self {
            config,
            store,
            event_emitter,
            firewall_tx,
            ignore_nets,
        })
    }

    /// Consume lines until shutdown or the tailer side closes.
    pub async fn run(
        self,
        mut line_rx: mpsc::Receiver<String>,
        mut shutdown_rx: broadcast::Receiver<()>,
    ) {
        info!("Detector started for config: {}", self.config.id);
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    info!("Detector {} received shutdown signal", self.config.id);
                    break;
                }
                line = line_rx.recv() => {
                    match line {
                        Some(l) => {
                            if let Err(e) = self.handle_line(&l).await {
                                error!("Error handling line: {}", e);
                            }
                        }
                        None => break, // tailer gone
                    }
                }
            }
        }
        info!("Detector {} stopped", self.config.id);
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
        let timestamp = now_millis();

        // Record the match in memory (critical path, O(1)).
        self.store.add_match(&self.config.id, ip, timestamp);

        // Emit match event (async, non-blocking) for the durable audit log.
        self.event_emitter
            .emit(Event::Match {
                config_id: self.config.id.clone(),
                ip: ip.to_string(),
                timestamp,
                line: line.to_string(),
            })
            .await;

        // Count this IP's matches within the find_time window (pruned lazily)
        // and ban if the threshold is reached and the IP is not already banned.
        let cutoff = timestamp.saturating_sub(self.config.find_time);
        let count = self.store.count_matches(&self.config.id, &ip, cutoff);
        if count >= self.config.max_matches as usize && !self.store.is_banned(&self.config.id, &ip) {
            if let Err(e) = self.ban_ip(&ip, timestamp).await {
                error!("Failed to ban IP {}: {}", ip, e);
                // Continue anyway, don't block critical path
            }
        }

        Ok(())
    }

    async fn ban_ip(&self, ip: &IpAddr, timestamp: u64) -> Result<(), String> {
        info!("Banning IP {} for config {}", ip, self.config.id);

        // Record the ban in memory (critical path). With the recidive
        // multiplicator on, the duration grows with each prior ban of this IP;
        // otherwise it is the flat config ban_time (legacy path).
        if self.config.recidive_multiplicator.is_some() {
            let prior = self.store.next_recidive(&self.config.id, *ip);
            let ban_time = self.config.effective_ban_time(prior);
            self.store
                .add_ban_with_duration(&self.config.id, *ip, timestamp, ban_time);
        } else {
            self.store.add_ban(&self.config.id, *ip, timestamp);
        }

        // Hand the firewall mutation to the actor (lossless mpsc). Errors there
        // are logged and ignored, so a full channel is the only failure mode.
        let deny = FirewallCommand::Deny {
            config_id: self.config.id.clone(),
            ip: *ip,
        };
        if self.firewall_tx.send(deny).await.is_err() {
            warn!("Firewall actor gone, could not deny IP {}", ip);
        }

        // Emit ban event (async, non-blocking) for the audit log and UI.
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
        self.ignore_nets.iter().any(|net| net.contains(ip))
    }
}

pub fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}
