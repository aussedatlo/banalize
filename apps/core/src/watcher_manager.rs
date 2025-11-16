use crate::config::Config;
use crate::database::SledDatabase;
use crate::events::EventEmitter;
use crate::firewall::Firewall;
use crate::watcher::Watcher;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tokio::task::JoinHandle;
use tracing::{info, warn};

pub struct WatcherManager {
    sled_db: Arc<SledDatabase>,
    event_emitter: Arc<EventEmitter>,
    firewall: Arc<RwLock<Firewall>>,
    watchers: Arc<RwLock<HashMap<String, (JoinHandle<()>, broadcast::Sender<()>)>>>,
    shutdown_tx: broadcast::Sender<()>,
}

impl WatcherManager {
    pub fn new(
        sled_db: Arc<SledDatabase>,
        event_emitter: Arc<EventEmitter>,
        firewall: Arc<RwLock<Firewall>>,
    ) -> Self {
        let (shutdown_tx, _) = broadcast::channel(16);
        Self {
            sled_db,
            event_emitter,
            firewall,
            watchers: Arc::new(RwLock::new(HashMap::new())),
            shutdown_tx,
        }
    }

    /// Start a watcher for a config
    pub async fn start_watcher(&self, config: Config) -> Result<(), String> {
        // Validate config
        config.validate()?;

        let config_id = config.id.clone();
        let mut watchers = self.watchers.write().await;

        // Check if watcher already exists
        if watchers.contains_key(&config_id) {
            return Err(format!("Watcher for config {} already exists", config_id));
        }

        // Create watcher
        let watcher = Watcher::new(
            config.clone(),
            self.sled_db.clone(),
            self.event_emitter.clone(),
            self.firewall.clone(),
        )?;

        // Create shutdown channel for this watcher
        let (shutdown_tx, shutdown_rx) = broadcast::channel(16);

        // Spawn watcher task
        let handle = tokio::spawn(async move {
            watcher.run(shutdown_rx).await;
        });

        watchers.insert(config_id.clone(), (handle, shutdown_tx));
        info!("Started watcher for config: {}", config_id);

        Ok(())
    }

    /// Stop a watcher for a config
    pub async fn stop_watcher(&self, config_id: &str) -> Result<(), String> {
        let mut watchers = self.watchers.write().await;

        if let Some((mut handle, shutdown_tx)) = watchers.remove(config_id) {
            // Send shutdown signal
            let _ = shutdown_tx.send(());
            // Wait for task to complete (with timeout)
            tokio::select! {
                _ = &mut handle => {
                    info!("Watcher {} stopped", config_id);
                }
                _ = tokio::time::sleep(tokio::time::Duration::from_secs(5)) => {
                    warn!("Watcher {} did not stop within timeout, aborting", config_id);
                    handle.abort();
                }
            }
            Ok(())
        } else {
            Err(format!("Watcher for config {} not found", config_id))
        }
    }

    /// Restart a watcher (stop and start)
    pub async fn restart_watcher(&self, config: Config) -> Result<(), String> {
        let config_id = config.id.clone();
        if self.watchers.read().await.contains_key(&config_id) {
            self.stop_watcher(&config_id).await?;
        }
        self.start_watcher(config).await
    }

    /// Stop all watchers
    pub async fn stop_all(&self) {
        info!("Stopping all watchers");
        let mut watchers = self.watchers.write().await;
        let config_ids: Vec<String> = watchers.keys().cloned().collect();
        
        for config_id in config_ids {
            if let Some((mut handle, shutdown_tx)) = watchers.remove(&config_id) {
                let _ = shutdown_tx.send(());
                tokio::select! {
                    _ = &mut handle => {
                        info!("Watcher {} stopped", config_id);
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_secs(5)) => {
                        warn!("Watcher {} did not stop within timeout, aborting", config_id);
                        handle.abort();
                    }
                }
            }
        }
    }

    /// Check if a watcher is running
    pub async fn is_running(&self, config_id: &str) -> bool {
        self.watchers.read().await.contains_key(config_id)
    }
}

