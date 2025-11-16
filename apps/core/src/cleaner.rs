use crate::config::ConfigMap;
use crate::database::SledDatabase;
use crate::events::EventEmitter;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

pub struct Cleaner {
    sled_db: Arc<SledDatabase>,
    configs: Arc<RwLock<ConfigMap>>,
    event_emitter: Arc<EventEmitter>,
    interval_secs: u64,
}

impl Cleaner {
    pub fn new(
        sled_db: Arc<SledDatabase>,
        configs: Arc<RwLock<ConfigMap>>,
        event_emitter: Arc<EventEmitter>,
        interval_secs: u64,
    ) -> Self {
        Self {
            sled_db,
            configs,
            event_emitter,
            interval_secs,
        }
    }

    pub async fn run(&self, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(self.interval_secs));
        
        loop {
            tokio::select! {
                _ = shutdown_rx.recv() => {
                    info!("Cleaner received shutdown signal");
                    break;
                }
                _ = interval.tick() => {
                    if let Err(e) = self.cleanup().await {
                        warn!("Cleanup error: {}", e);
                    }
                }
            }
        }

        info!("Cleaner stopped");
    }

    async fn cleanup(&self) -> Result<(), String> {
        debug!("Cleaning up...");
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let configs = self.configs.read().await;

        // Clean matches: remove entries older than find_time for each config
        for (config_id, config) in configs.iter() {
            let cutoff = now.saturating_sub(config.find_time);
            match self.sled_db.get_matches_for_config(config_id) {
                Ok(matches) => {
                    debug!("Matches: {:?}", matches);
                    let mut removed_count = 0;
                    for (ip_str, timestamp) in matches {
                        if timestamp < cutoff {
                            // Reconstruct the key to remove it
                            // Key format: match:<config_id>:<ip>:<timestamp>
                            let key = format!("match:{}:{}:{}", config_id, ip_str, timestamp);
                            if let Err(e) = self.sled_db.remove_match_by_key(&key) {
                                warn!("Failed to remove old match {}: {}", key, e);
                            } else {
                                removed_count += 1;
                            }
                        }
                    }
                    if removed_count > 0 {
                        info!("Cleaned {} old matches for config {}", removed_count, config_id);
                    }
                }
                Err(e) => {
                    warn!("Failed to get matches for config {}: {}", config_id, e);
                }
            }
        }

        // Clean bans: remove entries older than ban_time for each config
        for (config_id, config) in configs.iter() {
            let cutoff = now.saturating_sub(config.ban_time);
            match self.sled_db.get_bans_for_config(config_id) {
                Ok(bans) => {
                    debug!("Bans: {:?}", bans);
                    let mut removed_count = 0;
                    for (ip_str, timestamp) in bans {
                        if timestamp < cutoff {
                            // Reconstruct the key to remove it
                            // Key format: ban:<config_id>:<ip>:<timestamp>
                            let key = format!("ban:{}:{}:{}", config_id, ip_str, timestamp);
                            if let Err(e) = self.sled_db.remove_ban_by_key(&key) {
                                warn!("Failed to remove old ban {}: {}", key, e);
                            } else {
                                removed_count += 1;
                                
                                // Emit unban event using EventEmitter
                                // Firewall handler will process this event and remove the firewall rule
                                let event_emitter = self.event_emitter.clone();
                                let config_id_clone = config_id.clone();
                                let ip_str_clone = ip_str.clone();
                                let unban_timestamp = now;
                                event_emitter
                                    .emit(crate::events::Event::Unban {
                                        config_id: config_id_clone,
                                        ip: ip_str_clone,
                                        timestamp: unban_timestamp,
                                    })
                                    .await;
                            }
                        }
                    }
                    if removed_count > 0 {
                        info!("Cleaned {} old bans for config {}", removed_count, config_id);
                    }
                }
                Err(e) => {
                    warn!("Failed to get bans for config {}: {}", config_id, e);
                }
            }
        }

        Ok(())
    }
}

