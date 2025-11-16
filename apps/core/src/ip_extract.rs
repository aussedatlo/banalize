use regex::Regex;
use std::collections::HashMap;

const IP_REGEX: &str = r"\b(?:\d{1,3}\.){3}\d{1,3}\b";

pub struct IpExtractor {
    regex_cache: HashMap<String, Regex>,
}

impl IpExtractor {
    pub fn new() -> Self {
        Self {
            regex_cache: HashMap::new(),
        }
    }

    pub fn extract_ip(&mut self, pattern: &str, line: &str) -> Option<String> {
        // Get or compile regex
        let regex = self.regex_cache.entry(pattern.to_string()).or_insert_with(|| {
            let ip_regex = IP_REGEX;
            let final_pattern = pattern.replace("<IP>", ip_regex);
            Regex::new(&final_pattern).expect("Invalid regex pattern")
        });

        // Find match
        if let Some(captures) = regex.captures(line) {
            // Extract IP from the match
            let ip_regex = Regex::new(IP_REGEX).unwrap();
            if let Some(ip_match) = ip_regex.find(captures.get(0)?.as_str()) {
                return Some(ip_match.as_str().to_string());
            }
        }

        None
    }
}

impl Default for IpExtractor {
    fn default() -> Self {
        Self::new()
    }
}

