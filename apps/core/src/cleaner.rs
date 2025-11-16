use crate::config::Config;
use crate::database::CoreDatabase;
use crate::events::{UnbanEvent, EventEmitter};
use crate::firewall::Firewall;
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

        let configs_snapshot = configs.lock().unwrap().clone();
        for (config_id, config) in configs_snapshot.iter() {
            let cutoff = now.saturating_sub(config.find_time);
            let matches = database.get_matches_for_config(config_id)?;
            
            // filter matches to remove older than cutoff
            let matches_to_remove: Vec<_> = matches
                .into_iter()
                .filter(|m| m.timestamp < cutoff)
                .collect();
            
            // remove old matches
            if !matches_to_remove.is_empty() {
                let removed = database.remove_matches(&matches_to_remove)?;
                if removed > 0 {
                    info!("Removed {} old match(es) for config {}", removed, config_id);
                }
            }

            // Cleanup expired bans for this config (older than ban_time)
            let ban_cutoff = now.saturating_sub(config.ban_time);
            let bans = database.get_bans_for_config(config_id)?;
            
            // filter bans to remove older than cutoff
            let bans_to_remove: Vec<_> = bans
                .into_iter()
                .filter(|b| b.timestamp < ban_cutoff)
                .collect();
            
            // process each expired ban (need individual processing for unban events)
            for ban in bans_to_remove {
                info!("Removing expired ban for {}, timestamp {}", ban.ip, ban.timestamp);
                database.remove_ban(&ban.config_id, &ban.ip, ban.timestamp)?;
                
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

                // Emit unban event
                let unban_event = UnbanEvent::new(ban.ip.clone(), now, ban.config_id.clone());
                event_emitter.emit_unban(unban_event);
            }
        }

        Ok(())
    }
}

