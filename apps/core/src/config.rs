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
    /// Optional escalation factor for repeat offenders. When set, each
    /// successive ban of the same (config, IP) lasts
    /// `ban_time * recidive_multiplicator^prior_bans` — exponential growth.
    /// `None` keeps the flat `ban_time` for every ban.
    #[serde(default)]
    pub recidive_multiplicator: Option<f64>,
}

/// Validate a config regex the way the watcher will actually use it: it must
/// carry the `<IP>` placeholder, and once that is substituted for the IP
/// capture pattern the result must compile under `fancy-regex`. Returns a
/// human-readable reason on failure. Shared by `Config::validate` and the
/// `/api/configs/validate-regex` endpoint so the two can never drift.
pub fn validate_regex_pattern(regex: &str) -> Result<(), String> {
    if !regex.contains("<IP>") {
        return Err("regex must contain <IP> placeholder".to_string());
    }
    let pattern = regex.replace("<IP>", crate::ip_extract::IP_PATTERN);
    if let Err(e) = fancy_regex::Regex::new(&pattern) {
        return Err(format!("regex does not compile: {}", e));
    }
    Ok(())
}

impl Config {
    /// Effective ban duration for a ban preceded by `prior_bans` earlier bans of
    /// the same (config, IP). With the multiplicator off this is always
    /// `ban_time`; with it on it grows geometrically (prior_bans 0 -> ban_time,
    /// 1 -> ban_time * m, 2 -> ban_time * m^2, ...).
    pub fn effective_ban_time(&self, prior_bans: u32) -> u64 {
        match self.recidive_multiplicator {
            Some(m) => (self.ban_time as f64 * m.powi(prior_bans as i32)) as u64,
            None => self.ban_time,
        }
    }

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
        validate_regex_pattern(&self.regex)?;
        if self.ban_time == 0 {
            return Err("ban_time must be greater than 0".to_string());
        }
        if self.find_time == 0 {
            return Err("find_time must be greater than 0".to_string());
        }
        if self.max_matches == 0 {
            return Err("max_matches must be greater than 0".to_string());
        }
        if let Some(m) = self.recidive_multiplicator {
            // Reject NaN/infinity as well as anything that wouldn't actually grow.
            if !m.is_finite() || m <= 1.0 {
                return Err("recidive_multiplicator must be greater than 1".to_string());
            }
        }
        Ok(())
    }
}

pub type ConfigMap = HashMap<String, Config>;

#[cfg(test)]
mod tests {
    use super::*;

    fn base_config() -> Config {
        Config {
            id: "c".to_string(),
            name: "c".to_string(),
            param: "/tmp/log".to_string(),
            regex: "<IP>".to_string(),
            ban_time: 1000,
            find_time: 1000,
            max_matches: 3,
            ignore_ips: vec![],
            recidive_multiplicator: None,
        }
    }

    #[test]
    fn effective_ban_time_is_flat_when_multiplicator_unset() {
        let config = base_config();
        assert_eq!(config.effective_ban_time(0), 1000);
        assert_eq!(config.effective_ban_time(5), 1000);
    }

    #[test]
    fn effective_ban_time_grows_geometrically() {
        let config = Config {
            recidive_multiplicator: Some(2.0),
            ..base_config()
        };
        assert_eq!(config.effective_ban_time(0), 1000); // first ban
        assert_eq!(config.effective_ban_time(1), 2000); // * 2
        assert_eq!(config.effective_ban_time(2), 4000); // * 2^2
        assert_eq!(config.effective_ban_time(3), 8000); // * 2^3
    }

    #[test]
    fn validate_rejects_multiplicator_not_greater_than_one() {
        for bad in [1.0, 0.5, 0.0] {
            let config = Config {
                recidive_multiplicator: Some(bad),
                ..base_config()
            };
            assert!(config.validate().is_err(), "expected {bad} to be rejected");
        }
    }

    #[test]
    fn validate_accepts_multiplicator_above_one_and_none() {
        assert!(base_config().validate().is_ok());
        let config = Config {
            recidive_multiplicator: Some(1.5),
            ..base_config()
        };
        assert!(config.validate().is_ok());
    }

    #[test]
    fn validate_regex_pattern_accepts_usable_patterns() {
        assert!(validate_regex_pattern("Failed password .* from <IP>").is_ok());
        // Look-around is the reason this branch moved to fancy-regex.
        assert!(validate_regex_pattern("(?<=user )<IP>").is_ok());
    }

    #[test]
    fn validate_regex_pattern_requires_ip_placeholder() {
        let err = validate_regex_pattern("Failed password").unwrap_err();
        assert!(err.contains("<IP>"), "unexpected message: {err}");
    }

    #[test]
    fn validate_regex_pattern_rejects_non_compiling_regex() {
        let err = validate_regex_pattern("(<IP>").unwrap_err();
        assert!(err.contains("does not compile"), "unexpected message: {err}");
    }
}

