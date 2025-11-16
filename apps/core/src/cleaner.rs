use crate::config::ConfigMap;
use crate::database::SledDatabase;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn};

pub struct Cleaner {
    sled_db: Arc<SledDatabase>,
    configs: Arc<RwLock<ConfigMap>>,
    interval_secs: u64,
}

impl Cleaner {
    pub fn new(
        sled_db: Arc<SledDatabase>,
        configs: Arc<RwLock<ConfigMap>>,
        interval_secs: u64,
    ) -> Self {
        Self {
            sled_db,
            configs,
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
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let configs = self.configs.read().await;

        // Clean matches: remove entries older than find_time for each config
        for (config_id, config) in configs.iter() {
            let cutoff = now.saturating_sub(config.find_time);
            match self.sled_db.get_old_matches(cutoff) {
                Ok(old_matches) => {
                    let mut count = 0;
                    for (match_config_id, _, key, _) in old_matches {
                        if match_config_id == *config_id {
                            if let Err(e) = self.sled_db.remove_match_by_key(&key) {
                                warn!("Failed to remove old match {}: {}", key, e);
                            } else {
                                count += 1;
                            }
                        }
                    }
                    if count > 0 {
                        info!("Cleaned {} old matches for config {}", count, config_id);
                    }
                }
                Err(e) => {
                    warn!("Failed to get old matches for config {}: {}", config_id, e);
                }
            }
        }

        // Clean bans: remove entries older than ban_time for each config
        for (config_id, config) in configs.iter() {
            let cutoff = now.saturating_sub(config.ban_time);
            match self.sled_db.get_old_bans(cutoff) {
                Ok(old_bans) => {
                    let mut count = 0;
                    for (ban_config_id, ip_str, key, _) in old_bans {
                        if ban_config_id == *config_id {
                            if let Err(e) = self.sled_db.remove_ban_by_key(&key) {
                                warn!("Failed to remove old ban {}: {}", key, e);
                            } else {
                                count += 1;
                                // Also remove from firewall
                                if let Ok(ip) = ip_str.parse::<std::net::IpAddr>() {
                                    // Note: We'd need firewall access here, but for now we'll just log
                                    // The firewall rules will be cleaned up separately if needed
                                    info!("Ban expired for IP {} in config {}", ip, config_id);
                                }
                            }
                        }
                    }
                    if count > 0 {
                        info!("Cleaned {} old bans for config {}", count, config_id);
                    }
                }
                Err(e) => {
                    warn!("Failed to get old bans for config {}: {}", config_id, e);
                }
            }
        }

        Ok(())
    }
}

