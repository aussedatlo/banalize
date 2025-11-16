use regex::Regex;
use std::net::IpAddr;

/// Extract IP address from a line using a regex pattern that contains <IP> placeholder
pub fn extract_ip(regex_pattern: &str, line: &str) -> Option<IpAddr> {
    // Replace <IP> with IPv4 regex pattern
    let ip_regex = r"(\b(?:\d{1,3}\.){3}\d{1,3}\b)";
    let final_pattern = regex_pattern.replace("<IP>", ip_regex);
    
    let re = match Regex::new(&final_pattern) {
        Ok(re) => re,
        Err(_) => return None,
    };
    
    if let Some(captures) = re.captures(line) {
        // Find the IP capture group (should be the first capture group)
        for i in 1..captures.len() {
            if let Some(ip_str) = captures.get(i) {
                if let Ok(ip) = ip_str.as_str().parse::<IpAddr>() {
                    return Some(ip);
                }
            }
        }
    }
    
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_ip() {
        let pattern = ".*<IP>.*";
        let line = "Connection from 192.168.1.1";
        let ip = extract_ip(pattern, line);
        assert!(ip.is_some());
        assert_eq!(ip.unwrap().to_string(), "192.168.1.1");
    }
}

