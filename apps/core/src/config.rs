use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigData {
    pub id: String,
    pub name: String,
    pub param: String,
    pub regex: String,
    pub ban_time: u64,
    pub find_time: u64,
    pub max_matches: u32,
    pub ignore_ips: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Config {
    pub id: String,
    pub name: String,
    pub param: String, // File path or resource to watch
    pub regex: String,
    pub compiled_regex: Regex,
    pub ban_time: u64,      // in milliseconds
    pub find_time: u64,     // in milliseconds
    pub max_matches: u32,
    pub ignore_ips: Vec<String>,
}

impl Config {
    pub fn new(
        id: String,
        name: String,
        param: String,
        regex: String,
        ban_time: u64,
        find_time: u64,
        max_matches: u32,
        ignore_ips: Vec<String>,
    ) -> anyhow::Result<Self> {
        // Validate regex contains <IP> placeholder
        if !regex.contains("<IP>") {
            return Err(anyhow::anyhow!("Regex must contain <IP> placeholder"));
        }

        // Compile regex with <IP> placeholder replaced
        let ip_regex = r"\b(?:\d{1,3}\.){3}\d{1,3}\b";
        let final_pattern = regex.replace("<IP>", ip_regex);
        let compiled_regex = Regex::new(&final_pattern)
            .map_err(|e| anyhow::anyhow!("Invalid regex pattern: {}", e))?;

        Ok(Self {
            id,
            name,
            param,
            regex,
            compiled_regex,
            ban_time,
            find_time,
            max_matches,
            ignore_ips,
        })
    }

    pub fn file_path(&self) -> Option<PathBuf> {
        Some(PathBuf::from(&self.param))
    }

    pub fn update(
        &mut self,
        name: Option<String>,
        param: Option<String>,
        regex: Option<String>,
        ban_time: Option<u64>,
        find_time: Option<u64>,
        max_matches: Option<u32>,
        ignore_ips: Option<Vec<String>>,
    ) -> anyhow::Result<()> {
        if let Some(n) = name {
            self.name = n;
        }
        if let Some(p) = param {
            self.param = p;
        }
        if let Some(r) = regex {
            if !r.contains("<IP>") {
                return Err(anyhow::anyhow!("Regex must contain <IP> placeholder"));
            }
            let ip_regex = r"\b(?:\d{1,3}\.){3}\d{1,3}\b";
            let final_pattern = r.replace("<IP>", ip_regex);
            self.compiled_regex = Regex::new(&final_pattern)
                .map_err(|e| anyhow::anyhow!("Invalid regex pattern: {}", e))?;
            self.regex = r;
        }
        if let Some(bt) = ban_time {
            self.ban_time = bt;
        }
        if let Some(ft) = find_time {
            self.find_time = ft;
        }
        if let Some(mm) = max_matches {
            self.max_matches = mm;
        }
        if let Some(ips) = ignore_ips {
            self.ignore_ips = ips;
        }
        Ok(())
    }

    /// Convert Config to ConfigData for serialization
    pub fn to_data(&self) -> ConfigData {
        ConfigData {
            id: self.id.clone(),
            name: self.name.clone(),
            param: self.param.clone(),
            regex: self.regex.clone(),
            ban_time: self.ban_time,
            find_time: self.find_time,
            max_matches: self.max_matches,
            ignore_ips: self.ignore_ips.clone(),
        }
    }

    /// Create Config from ConfigData
    pub fn from_data(data: ConfigData) -> anyhow::Result<Self> {
        Self::new(
            data.id,
            data.name,
            data.param,
            data.regex,
            data.ban_time,
            data.find_time,
            data.max_matches,
            data.ignore_ips,
        )
    }
}

