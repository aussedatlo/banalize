use crate::config::Config;
use crate::database::CoreDatabase;
use crate::events::UnbanEvent;
use crate::firewall::Firewall;
use crate::event_emitter::EventEmitter;
use crate::time_utils::get_millis_timestamp;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use anyhow::Result;
use tracing::{error, info};

pub struct Cleaner {
    configs: Arc<Mutex<HashMap<String, Arc<Config>>>>,
    database: Arc<CoreDatabase>,
    firewall: Arc<Mutex<Firewall>>,
    event_emitter: Arc<EventEmitter>,
}

impl Cleaner {
    pub fn new(
        configs: Arc<Mutex<HashMap<String, Arc<Config>>>>,
        database: Arc<CoreDatabase>,
        firewall: Arc<Mutex<Firewall>>,
        event_emitter: Arc<EventEmitter>,
    ) -> Self {
        Self {
            configs,
            database,
            firewall,
            event_emitter,
        }
    }

    pub async fn start(&self) -> Result<()> {
        info!("Starting cleaner");

        let configs = self.configs.clone();
        let database = self.database.clone();
        let firewall = self.firewall.clone();
        let event_emitter = self.event_emitter.clone();

        // Spawn a background task for cleaning matches and bans every second
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
                if let Err(e) = Self::cleanup(&configs, &database, &firewall, &event_emitter).await {
                    error!("Error during cleanup: {:?}", e);
                }
            }
        });

        // Keep the cleaner alive indefinitely
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        }
    }

    async fn cleanup(
        configs: &Arc<Mutex<HashMap<String, Arc<Config>>>>,
        database: &CoreDatabase,
        firewall: &Arc<Mutex<Firewall>>,
        event_emitter: &Arc<EventEmitter>,
    ) -> Result<()> {
        let now = get_millis_timestamp();

        // Cleanup old matches for each config (older than find_time)
        let configs_snapshot = configs.lock().unwrap().clone();
        for (config_id, config) in configs_snapshot.iter() {
            if let Ok(removed) = database.remove_old_matches(config_id, config.find_time) {
                if removed > 0 {
                    info!("Removed {} old match(es) for config {}", removed, config_id);
                }
            }
        }

        // Cleanup expired bans (older than ban_time from any config)
        // We need to find the maximum ban_time across all configs
        let max_ban_time = configs_snapshot
            .values()
            .map(|c| c.ban_time)
            .max()
            .unwrap_or(86400000); // Default 24 hours if no configs

        let expired_bans = database.get_expired_bans(max_ban_time)?;
        for ban in expired_bans {
            info!("Removing expired ban for {}, timestamp {}", ban.ip, ban.timestamp);
            database.remove_ban(&ban.ip, ban.timestamp)?;
            
            // Use spawn_blocking for firewall operations (non-critical, low priority)
            let firewall_clone = firewall.clone();
            let ip = ban.ip.clone();
            tokio::task::spawn_blocking(move || {
                if let Ok(mut fw) = firewall_clone.lock() {
                    if let Err(e) = fw.allow_ip_sync(&ip) {
                        error!("Failed to allow IP in firewall: {}", e);
                    }
                }
            }).await?;

            // Emit unban event (non-blocking, low priority)
            // We need to find which config this ban belongs to
            // For simplicity, we'll use the first config or a default
            let config_id = configs_snapshot.keys().next()
                .map(|k| k.clone())
                .unwrap_or_else(|| "unknown".to_string());
            
            let unban_event = UnbanEvent::new(ban.ip.clone(), now, config_id);
            event_emitter.emit_unban(unban_event);
        }

        Ok(())
    }
}

