use crate::config::Config;
use crate::database::CoreDatabase;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tracing::{error, info};

pub struct ConfigManager {
    configs: Arc<Mutex<HashMap<String, Arc<Config>>>>,
    database: Arc<CoreDatabase>,
}

impl ConfigManager {
    pub fn new(database: Arc<CoreDatabase>) -> anyhow::Result<Self> {
        let manager = Self {
            configs: Arc::new(Mutex::new(HashMap::new())),
            database,
        };
        
        // Load configs from database on startup
        manager.load_configs_from_db()?;
        
        Ok(manager)
    }

    /// Load all configs from the database
    fn load_configs_from_db(&self) -> anyhow::Result<()> {
        let configs_data = self.database.load_all_configs()?;
        let mut configs = self.configs.lock().unwrap();
        
        for config_data in configs_data {
            match Config::from_data(config_data) {
                Ok(config) => {
                    let id = config.id.clone();
                    info!("Loaded config from database: {} ({})", config.name, id);
                    configs.insert(id, Arc::new(config));
                }
                Err(e) => {
                    error!("Failed to load config from database: {}", e);
                }
            }
        }
        
        info!("Loaded {} config(s) from database", configs.len());
        Ok(())
    }

    pub fn add_config(&self, config: Config) -> anyhow::Result<()> {
        let mut configs = self.configs.lock().unwrap();
        let id = config.id.clone();
        
        if configs.contains_key(&id) {
            return Err(anyhow::anyhow!("Config with id {} already exists", id));
        }
        
        // Save to database
        let config_data = config.to_data();
        if let Err(e) = self.database.save_config(&config_data) {
            error!("Failed to save config to database: {}", e);
            return Err(anyhow::anyhow!("Failed to save config to database: {}", e));
        }
        
        info!("Adding config: {} ({})", config.name, id);
        configs.insert(id, Arc::new(config));
        Ok(())
    }

    pub fn get_config(&self, id: &str) -> Option<Arc<Config>> {
        let configs = self.configs.lock().unwrap();
        configs.get(id).cloned()
    }

    pub fn update_config(
        &self,
        id: &str,
        name: Option<String>,
        param: Option<String>,
        regex: Option<String>,
        ban_time: Option<u64>,
        find_time: Option<u64>,
        max_matches: Option<u32>,
        ignore_ips: Option<Vec<String>>,
    ) -> anyhow::Result<()> {
        let mut configs = self.configs.lock().unwrap();
        
        if let Some(config_arc) = configs.get_mut(id) {
            // We need to clone, modify, and replace since Arc<Config> is not directly mutable
            let mut config = (**config_arc).clone();
            config.update(name, param, regex, ban_time, find_time, max_matches, ignore_ips)?;
            
            // Save to database
            let config_data = config.to_data();
            if let Err(e) = self.database.save_config(&config_data) {
                error!("Failed to save config to database: {}", e);
                return Err(anyhow::anyhow!("Failed to save config to database: {}", e));
            }
            
            *config_arc = Arc::new(config);
            info!("Updated config: {}", id);
            Ok(())
        } else {
            Err(anyhow::anyhow!("Config with id {} not found", id))
        }
    }

    pub fn remove_config(&self, id: &str) -> bool {
        let mut configs = self.configs.lock().unwrap();
        if configs.remove(id).is_some() {
            // Remove from database
            if let Err(e) = self.database.remove_config(id) {
                error!("Failed to remove config from database: {}", e);
            }
            info!("Removed config: {}", id);
            true
        } else {
            false
        }
    }

    pub fn list_configs(&self) -> Vec<Arc<Config>> {
        let configs = self.configs.lock().unwrap();
        configs.values().cloned().collect()
    }

    pub fn get_configs_arc(&self) -> Arc<Mutex<HashMap<String, Arc<Config>>>> {
        self.configs.clone()
    }
}

