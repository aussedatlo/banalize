use crate::config::ConfigMap;
use crate::events::{EventEmitter, FirewallCommand};
use crate::store::MemoryStore;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tracing::{debug, info, warn};

pub struct Cleaner {
    store: Arc<MemoryStore>,
    configs: Arc<RwLock<ConfigMap>>,
    event_emitter: Arc<EventEmitter>,
    firewall_tx: mpsc::Sender<FirewallCommand>,
    interval_secs: u64,
}

impl Cleaner {
    pub fn new(
        store: Arc<MemoryStore>,
        configs: Arc<RwLock<ConfigMap>>,
        event_emitter: Arc<EventEmitter>,
        firewall_tx: mpsc::Sender<FirewallCommand>,
        interval_secs: u64,
    ) -> Self {
        Self {
            store,
            configs,
            event_emitter,
            firewall_tx,
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

        // Prune match windows to reclaim memory (counting also prunes lazily).
        for (config_id, config) in configs.iter() {
            let cutoff = now.saturating_sub(config.find_time);
            self.store.prune_matches(config_id, cutoff);
        }

        // Expire bans: take everything past ban_time and push the unban out to
        // the firewall (lossless) and the audit log.
        for (config_id, _config) in configs.iter() {
            // Every ban carries its own effective duration (the flat config just
            // resolves to `ban_time`), so expiry is uniformly per-ban on
            // `timestamp + effective_ban_time`. Using one path means toggling the
            // recidive multiplicator never changes how an existing ban expires.
            let expired = self.store.take_expired_bans_now(config_id, now);
            if expired.is_empty() {
                continue;
            }
            debug!("Expiring {} bans for config {}", expired.len(), config_id);
            for ip in expired {
                let allow = FirewallCommand::Allow {
                    config_id: config_id.clone(),
                    ip,
                };
                let _ = self.firewall_tx.send(allow).await;
                self.event_emitter
                    .emit(crate::events::Event::Unban {
                        config_id: config_id.clone(),
                        ip: ip.to_string(),
                        timestamp: now,
                    })
                    .await;
            }
            info!("Expired bans for config {}", config_id);
        }

        Ok(())
    }
}

