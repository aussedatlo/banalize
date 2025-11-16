use sled::Db;
use std::net::IpAddr;
use std::path::Path;

const MATCH_PREFIX: &str = "match:";
const BAN_PREFIX: &str = "ban:";

pub struct SledDatabase {
    db: Db,
}

impl SledDatabase {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self, sled::Error> {
        let db = sled::open(path)?;
        Ok(Self { db })
    }

    /// Add a match entry: match:<config_id>:<ip>:<timestamp>
    pub fn add_match(
        &self,
        config_id: &str,
        ip: &IpAddr,
        timestamp: u64,
    ) -> Result<(), sled::Error> {
        let key = format!("{}:{}:{}:{}", MATCH_PREFIX, config_id, ip, timestamp);
        self.db.insert(key.as_bytes(), &[])?;
        Ok(())
    }

    /// Add a ban entry: ban:<config_id>:<ip>:<timestamp>
    pub fn add_ban(
        &self,
        config_id: &str,
        ip: &IpAddr,
        timestamp: u64,
    ) -> Result<(), sled::Error> {
        let key = format!("{}:{}:{}:{}", BAN_PREFIX, config_id, ip, timestamp);
        self.db.insert(key.as_bytes(), &[])?;
        Ok(())
    }

    /// Remove a match entry
    pub fn remove_match(
        &self,
        config_id: &str,
        ip: &IpAddr,
        timestamp: u64,
    ) -> Result<(), sled::Error> {
        let key = format!("{}:{}:{}:{}", MATCH_PREFIX, config_id, ip, timestamp);
        self.db.remove(key.as_bytes())?;
        Ok(())
    }

    /// Remove a ban entry
    pub fn remove_ban(
        &self,
        config_id: &str,
        ip: &IpAddr,
        timestamp: u64,
    ) -> Result<(), sled::Error> {
        let key = format!("{}:{}:{}:{}", BAN_PREFIX, config_id, ip, timestamp);
        self.db.remove(key.as_bytes())?;
        Ok(())
    }

    /// Get all matches for a config_id and ip within a time window
    /// Returns count of matches
    pub fn count_matches_in_window(
        &self,
        config_id: &str,
        ip: &IpAddr,
        start_time: u64,
        end_time: u64,
    ) -> Result<u32, sled::Error> {
        let prefix = format!("{}:{}:{}:", MATCH_PREFIX, config_id, ip);
        let start_key = format!("{}{}", prefix, start_time);
        let end_key = format!("{}{}", prefix, end_time);

        let mut count = 0;
        for item in self.db.range(start_key.as_bytes()..=end_key.as_bytes()) {
            let _ = item?;
            count += 1;
        }
        Ok(count)
    }

    /// Check if an IP is currently banned for a config
    pub fn is_banned(&self, config_id: &str, ip: &IpAddr) -> Result<bool, sled::Error> {
        let prefix = format!("{}:{}:{}:", BAN_PREFIX, config_id, ip);
        let mut iter = self.db.scan_prefix(prefix.as_bytes());
        Ok(iter.next().is_some())
    }

    /// Get all match entries older than a timestamp (for cleanup)
    pub fn get_old_matches(&self, before_timestamp: u64) -> Result<Vec<(String, String, String, u64)>, sled::Error> {
        let mut results = Vec::new();
        let prefix = MATCH_PREFIX.as_bytes();
        
        for item in self.db.scan_prefix(prefix) {
            let (key, _) = item?;
            let key_str = String::from_utf8_lossy(&key);
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() >= 4 {
                if let Ok(ts) = parts[3].parse::<u64>() {
                    if ts < before_timestamp {
                        results.push((
                            parts[1].to_string(), // config_id
                            parts[2].to_string(), // ip
                            key_str.to_string(),   // full key
                            ts,
                        ));
                    }
                }
            }
        }
        Ok(results)
    }

    /// Get all ban entries older than a timestamp (for cleanup)
    pub fn get_old_bans(&self, before_timestamp: u64) -> Result<Vec<(String, String, String, u64)>, sled::Error> {
        let mut results = Vec::new();
        let prefix = BAN_PREFIX.as_bytes();
        
        for item in self.db.scan_prefix(prefix) {
            let (key, _) = item?;
            let key_str = String::from_utf8_lossy(&key);
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() >= 4 {
                if let Ok(ts) = parts[3].parse::<u64>() {
                    if ts < before_timestamp {
                        results.push((
                            parts[1].to_string(), // config_id
                            parts[2].to_string(), // ip
                            key_str.to_string(),   // full key
                            ts,
                        ));
                    }
                }
            }
        }
        Ok(results)
    }

    /// Remove a match by full key
    pub fn remove_match_by_key(&self, key: &str) -> Result<(), sled::Error> {
        self.db.remove(key.as_bytes())?;
        Ok(())
    }

    /// Remove a ban by full key
    pub fn remove_ban_by_key(&self, key: &str) -> Result<(), sled::Error> {
        self.db.remove(key.as_bytes())?;
        Ok(())
    }

    /// Get all matches for a config_id (for API)
    pub fn get_matches_for_config(&self, config_id: &str) -> Result<Vec<(String, u64)>, sled::Error> {
        let mut results = Vec::new();
        let prefix = format!("{}:{}:", MATCH_PREFIX, config_id);
        
        for item in self.db.scan_prefix(prefix.as_bytes()) {
            let (key, _) = item?;
            let key_str = String::from_utf8_lossy(&key);
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() >= 4 {
                if let Ok(ts) = parts[3].parse::<u64>() {
                    results.push((parts[2].to_string(), ts)); // (ip, timestamp)
                }
            }
        }
        Ok(results)
    }

    /// Get all bans for a config_id (for API)
    pub fn get_bans_for_config(&self, config_id: &str) -> Result<Vec<(String, u64)>, sled::Error> {
        let mut results = Vec::new();
        let prefix = format!("{}:{}:", BAN_PREFIX, config_id);
        
        for item in self.db.scan_prefix(prefix.as_bytes()) {
            let (key, _) = item?;
            let key_str = String::from_utf8_lossy(&key);
            let parts: Vec<&str> = key_str.split(':').collect();
            if parts.len() >= 4 {
                if let Ok(ts) = parts[3].parse::<u64>() {
                    results.push((parts[2].to_string(), ts)); // (ip, timestamp)
                }
            }
        }
        Ok(results)
    }
}

