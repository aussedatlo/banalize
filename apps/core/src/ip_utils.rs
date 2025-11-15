use ipnet::IpNet;
use std::net::IpAddr;

pub fn is_ip_in_list(ip: &str, ignore_list: &[String]) -> bool {
    let ip_addr: IpAddr = match ip.parse() {
        Ok(addr) => addr,
        Err(_) => return false,
    };

    for ignore in ignore_list {
        if ignore.contains('/') {
            // CIDR notation
            if let Ok(cidr) = ignore.parse::<IpNet>() {
                if cidr.contains(&ip_addr) {
                    return true;
                }
            }
        } else {
            // Direct IP match
            if let Ok(ignore_ip) = ignore.parse::<IpAddr>() {
                if ignore_ip == ip_addr {
                    return true;
                }
            }
        }
    }

    false
}

