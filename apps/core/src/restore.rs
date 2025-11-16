use crate::config::ConfigMap;
use crate::database::SledDatabase;
use crate::firewall::Firewall;
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, warn};

/// Restore firewall bans from sled database on startup
pub async fn restore_bans(
    sled_db: Arc<SledDatabase>,
    firewall: Arc<RwLock<Firewall>>,
    configs: Arc<RwLock<ConfigMap>>,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("Restoring firewall bans from database...");

    let configs_read = configs.read().await;
    let mut restored_count = 0;
    let mut expired_count = 0;

    // Iterate through all configs to get their bans
    for (config_id, config) in configs_read.iter() {
        match sled_db.get_bans_for_config(config_id) {
            Ok(bans) => {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as u64;

                for (ip_str, ban_timestamp) in bans {
                    // Check if ban is still valid (not expired)
                    let ban_age = now.saturating_sub(ban_timestamp);
                    if ban_age >= config.ban_time {
                        // Ban has expired, skip it
                        expired_count += 1;
                        continue;
                    }

                    // Parse IP address
                    match ip_str.parse::<IpAddr>() {
                        Ok(ip) => {
                            // Restore firewall rule
                            let firewall_read = firewall.read().await;
                            match firewall_read.deny_ip_sync(&ip) {
                                Ok(_) => {
                                    restored_count += 1;
                                    info!("Restored firewall ban for IP {} (config: {})", ip, config_id);
                                }
                                Err(e) => {
                                    warn!("Failed to restore firewall ban for IP {} (config: {}): {}", ip, config_id, e);
                                }
                            }
                        }
                        Err(e) => {
                            warn!("Invalid IP address in ban record: {} (config: {}): {}", ip_str, config_id, e);
                        }
                    }
                }
            }
            Err(e) => {
                warn!("Failed to get bans for config {}: {}", config_id, e);
            }
        }
    }

    info!("Restored {} firewall bans ({} expired bans skipped)", restored_count, expired_count);
    Ok(())
}

