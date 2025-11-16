use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    pub id: String,
    pub name: String,
    pub param: String, // File path to watch
    pub regex: String, // Regex pattern with <IP> placeholder
    pub ban_time: u64, // Ban duration in milliseconds
    pub find_time: u64, // Time window for matches in milliseconds
    pub max_matches: u32, // Maximum matches before ban
    pub ignore_ips: Vec<String>, // IPs or CIDR ranges to ignore
}

impl Config {
    pub fn validate(&self) -> Result<(), String> {
        if self.id.is_empty() {
            return Err("id cannot be empty".to_string());
        }
        if self.name.is_empty() {
            return Err("name cannot be empty".to_string());
        }
        if self.param.is_empty() {
            return Err("param cannot be empty".to_string());
        }
        if !self.regex.contains("<IP>") {
            return Err("regex must contain <IP> placeholder".to_string());
        }
        if self.ban_time == 0 {
            return Err("ban_time must be greater than 0".to_string());
        }
        if self.find_time == 0 {
            return Err("find_time must be greater than 0".to_string());
        }
        if self.max_matches == 0 {
            return Err("max_matches must be greater than 0".to_string());
        }
        Ok(())
    }
}

pub type ConfigMap = HashMap<String, Config>;

