use crate::config_manager::ConfigManager;
use crate::database::CoreDatabase;
use crate::file_watcher::FileWatcher;
use crate::firewall::Firewall;
use crate::events::EventEmitter;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::task::JoinHandle;
use tracing::{error, info};

pub struct WatcherManager {
    watchers: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
    config_manager: Arc<ConfigManager>,
    database: Arc<CoreDatabase>,
    firewall: Arc<Mutex<Firewall>>,
    event_emitter: Arc<EventEmitter>,
}

impl WatcherManager {
    pub fn new(
        config_manager: Arc<ConfigManager>,
        database: Arc<CoreDatabase>,
        firewall: Arc<Mutex<Firewall>>,
        event_emitter: Arc<EventEmitter>,
    ) -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
            config_manager,
            database,
            firewall,
            event_emitter,
        }
    }

    /// Start a watcher for a config
    pub async fn start_watcher(&self, config_id: &str) -> anyhow::Result<()> {
        let config = self.config_manager.get_config(config_id)
            .ok_or_else(|| anyhow::anyhow!("Config {} not found", config_id))?;

        // Validate file path exists and is readable
        if let Some(file_path) = config.file_path() {
            if !file_path.exists() {
                return Err(anyhow::anyhow!("File path does not exist: {:?}", file_path));
            }
            if !file_path.is_file() {
                return Err(anyhow::anyhow!("Path is not a file: {:?}", file_path));
            }
        } else {
            return Err(anyhow::anyhow!("Config param is not a valid file path"));
        }

        // Check if watcher already exists
        {
            let watchers = self.watchers.lock().unwrap();
            if watchers.contains_key(config_id) {
                return Err(anyhow::anyhow!("Watcher for config {} already running", config_id));
            }
        }

        info!("Starting watcher for config: {}", config_id);

        // Create and start watcher
        let watcher = FileWatcher::new(
            config.clone(),
            self.database.clone(),
            self.firewall.clone(),
            self.event_emitter.clone(),
        );

        let config_id_clone = config_id.to_string();
        let handle = tokio::spawn(async move {
            if let Err(e) = watcher.start().await {
                error!("Watcher for config {} stopped with error: {:?}", config_id_clone, e);
            }
        });

        {
            let mut watchers = self.watchers.lock().unwrap();
            watchers.insert(config_id.to_string(), handle);
        }

        info!("Started watcher for config: {}", config_id);
        Ok(())
    }

    /// Stop a watcher for a config
    pub async fn stop_watcher(&self, config_id: &str) -> bool {
        let mut watchers = self.watchers.lock().unwrap();
        if let Some(handle) = watchers.remove(config_id) {
            handle.abort();
            info!("Stopped watcher for config: {}", config_id);
            true
        } else {
            false
        }
    }

    /// Restart a watcher (stop then start)
    pub async fn restart_watcher(&self, config_id: &str) -> anyhow::Result<()> {
        self.stop_watcher(config_id).await;
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        self.start_watcher(config_id).await
    }

    /// Get watcher status for all configs
    pub fn get_watcher_statuses(&self) -> HashMap<String, bool> {
        let configs = self.config_manager.list_configs();
        let watchers = self.watchers.lock().unwrap();
        
        configs.iter()
            .map(|config| {
                let running = watchers.get(&config.id)
                    .map(|h| !h.is_finished())
                    .unwrap_or(false);
                (config.id.clone(), running)
            })
            .collect()
    }
}

