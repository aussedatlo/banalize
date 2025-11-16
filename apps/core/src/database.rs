use crate::config::ConfigData;
use std::path::PathBuf;
use tracing::warn;

// ============================================================================
// Types
// ============================================================================

pub struct CoreDatabase {
    matches_tree: sled::Tree,
    bans_tree: sled::Tree,
    configs_tree: sled::Tree,
}

#[derive(Debug, Clone)]
pub struct MatchRecord {
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone)]
pub struct BanRecord {
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

// ============================================================================
// CoreDatabase - Initialization
// ============================================================================

impl CoreDatabase {
    pub fn new() -> anyhow::Result<Self> {
        let db_path = PathBuf::from("/tmp/banalize-core");
        let db = sled::open(&db_path)?;
        let matches_tree = db.open_tree("matches")?;
        let bans_tree = db.open_tree("bans")?;
        let configs_tree = db.open_tree("configs")?;

        Ok(Self {
            matches_tree,
            bans_tree,
            configs_tree,
        })
    }
}

// ============================================================================
// CoreDatabase - Key Utilities
// ============================================================================

impl CoreDatabase {
    /// Create a match key: match:<config_id>:<ip>:<timestamp>
    pub fn make_match_key(config_id: &str, ip: &str, timestamp: u64) -> String {
        format!("match:{}:{}:{}", config_id, ip, timestamp)
    }

    /// Parse a match key: match:<config_id>:<ip>:<timestamp>
    fn parse_match_key(key: &[u8]) -> anyhow::Result<(String, String, u64)> {
        let key_str = String::from_utf8_lossy(key);
        let parts: Vec<&str> = key_str.split(':').collect();
        
        if parts.len() != 4 || parts[0] != "match" {
            return Err(anyhow::anyhow!("Invalid match key format: {}", key_str));
        }
        
        let config_id = parts[1].to_string();
        let ip = parts[2].to_string();
        let timestamp = parts[3].parse::<u64>()
            .map_err(|e| anyhow::anyhow!("Invalid timestamp in key: {}", e))?;
        
        Ok((config_id, ip, timestamp))
    }

    /// Create a ban key: ban:<config_id>:<ip>:<timestamp>
    pub fn make_ban_key(config_id: &str, ip: &str, timestamp: u64) -> String {
        format!("ban:{}:{}:{}", config_id, ip, timestamp)
    }

    /// Parse a ban key: ban:<config_id>:<ip>:<timestamp>
    fn parse_ban_key(key: &[u8]) -> anyhow::Result<(String, String, u64)> {
        let key_str = String::from_utf8_lossy(key);
        let parts: Vec<&str> = key_str.split(':').collect();
        
        if parts.len() != 4 || parts[0] != "ban" {
            return Err(anyhow::anyhow!("Invalid ban key format: {}", key_str));
        }
        
        let config_id = parts[1].to_string();
        let ip = parts[2].to_string();
        let timestamp = parts[3].parse::<u64>()
            .map_err(|e| anyhow::anyhow!("Invalid timestamp in key: {}", e))?;
        
        Ok((config_id, ip, timestamp))
    }
}

// ============================================================================
// CoreDatabase - Matches Operations
// ============================================================================

impl CoreDatabase {
    /// Add a match record for a config and IP
    pub fn add_match(&self, config_id: &str, ip: &str, timestamp: u64) -> anyhow::Result<()> {
        let key = Self::make_match_key(config_id, ip, timestamp);
        self.matches_tree.insert(key, b"")?;
        Ok(())
    }

    /// Count matches for a specific config_id and IP within find_time window
    pub fn count_matches(&self, config_id: &str, ip: &str, find_time: u64) -> anyhow::Result<usize> {
        let now = crate::time_utils::get_millis_timestamp();
        let cutoff = now.saturating_sub(find_time);
        
        let mut count = 0;
        let prefix = format!("match:{}:{}:", config_id, ip);

        for result in self.matches_tree.scan_prefix(prefix) {
            let (key, _) = result?;
            if let Ok((_, _, timestamp)) = Self::parse_match_key(&key) {
                if timestamp >= cutoff {
                    count += 1;
                }
            }
        }

        Ok(count)
    }


    /// Get all matches for a specific config_id
    pub fn get_matches_for_config(&self, config_id: &str) -> anyhow::Result<Vec<MatchRecord>> {
        let mut matches = Vec::new();
        let prefix = format!("match:{}:", config_id);

        for result in self.matches_tree.scan_prefix(prefix) {
            let (key, _) = result?;
            if let Ok((config_id, ip, timestamp)) = Self::parse_match_key(&key) {
                matches.push(MatchRecord { config_id, ip, timestamp });
            }
        }

        Ok(matches)
    }

    /// Remove matches by their records
    pub fn remove_matches(&self, matches: &[MatchRecord]) -> anyhow::Result<usize> {
        let mut removed = 0;
        for record in matches {
            let key = Self::make_match_key(&record.config_id, &record.ip, record.timestamp);
            if self.matches_tree.remove(key).is_ok() {
                removed += 1;
            }
        }
        Ok(removed)
    }

    /// Get all matches
    pub fn get_all_matches(&self) -> anyhow::Result<Vec<MatchRecord>> {
        let mut all_matches = Vec::new();

        for result in self.matches_tree.iter() {
            let (key, _) = result?;
            if let Ok((config_id, ip, timestamp)) = Self::parse_match_key(&key) {
                all_matches.push(MatchRecord { config_id, ip, timestamp });
            }
        }

        all_matches.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        Ok(all_matches)
    }
}

// ============================================================================
// CoreDatabase - Bans Operations
// ============================================================================

impl CoreDatabase {
    /// Check if an IP is currently banned (in any config)
    pub fn is_banned(&self, ip: &str) -> anyhow::Result<bool> {
        // Scan all bans and check if any match the IP
        for result in self.bans_tree.iter() {
            let (key, _) = result?;
            if let Ok((_, ban_ip, _)) = Self::parse_ban_key(&key) {
                if ban_ip == ip {
                    return Ok(true);
                }
            }
        }
        Ok(false)
    }

    /// Add a ban record for an IP and config
    pub fn add_ban(&self, config_id: &str, ip: &str, timestamp: u64) -> anyhow::Result<()> {
        let key = Self::make_ban_key(config_id, ip, timestamp);
        self.bans_tree.insert(key, b"")?;
        Ok(())
    }

    /// Remove a ban record for an IP and config
    pub fn remove_ban(&self, config_id: &str, ip: &str, timestamp: u64) -> anyhow::Result<()> {
        let key = Self::make_ban_key(config_id, ip, timestamp);
        if self.bans_tree.remove(key)?.is_none() {
            warn!("Ban not found");
        }
        Ok(())
    }

    /// Get all bans for a specific config_id
    pub fn get_bans_for_config(&self, config_id: &str) -> anyhow::Result<Vec<BanRecord>> {
        let mut bans = Vec::new();
        let prefix = format!("ban:{}:", config_id);

        for result in self.bans_tree.scan_prefix(prefix) {
            let (key, _) = result?;
            if let Ok((config_id, ip, timestamp)) = Self::parse_ban_key(&key) {
                bans.push(BanRecord { config_id, ip, timestamp });
            }
        }

        Ok(bans)
    }

    /// Get all active bans (not expired)
    pub fn get_all_bans(&self) -> anyhow::Result<Vec<BanRecord>> {
        let mut all_bans = Vec::new();

        for result in self.bans_tree.iter() {
            let (key, _) = result?;
            if let Ok((config_id, ip, timestamp)) = Self::parse_ban_key(&key) {
                all_bans.push(BanRecord { config_id, ip, timestamp });
            }
        }

        all_bans.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        Ok(all_bans)
    }
}

// ============================================================================
// CoreDatabase - Configs Operations
// ============================================================================

impl CoreDatabase {
    /// Save a config to the database
    pub fn save_config(&self, config: &ConfigData) -> anyhow::Result<()> {
        let key = format!("config:{}", config.id);
        let value = serde_json::to_vec(config)?;
        self.configs_tree.insert(key, value)?;
        Ok(())
    }

    /// Load all configs from the database
    pub fn load_all_configs(&self) -> anyhow::Result<Vec<ConfigData>> {
        let mut configs = Vec::new();
        let prefix = "config:";

        for result in self.configs_tree.scan_prefix(prefix) {
            let (_, value) = result?;
            if let Ok(config) = serde_json::from_slice::<ConfigData>(&value) {
                configs.push(config);
            }
        }

        Ok(configs)
    }

    /// Remove a config from the database
    pub fn remove_config(&self, id: &str) -> anyhow::Result<()> {
        let key = format!("config:{}", id);
        self.configs_tree.remove(key)?;
        Ok(())
    }
}
