use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct MatchEvent {
    pub event_id: String,
    pub line: String,
    pub regex: String,
    pub ip: String,
    pub timestamp: u64,
    pub config_id: String,
}

#[derive(Debug, Clone)]
pub struct BanEvent {
    pub event_id: String,
    pub ip: String,
    pub timestamp: u64,
    pub config_id: String,
}

#[derive(Debug, Clone)]
pub struct UnbanEvent {
    pub event_id: String,
    pub ip: String,
    pub timestamp: u64,
    pub config_id: String,
}

impl MatchEvent {
    pub fn new(line: String, regex: String, ip: String, timestamp: u64, config_id: String) -> Self {
        Self {
            event_id: Uuid::new_v4().to_string(),
            line,
            regex,
            ip,
            timestamp,
            config_id,
        }
    }
}

impl BanEvent {
    pub fn new(ip: String, timestamp: u64, config_id: String) -> Self {
        Self {
            event_id: Uuid::new_v4().to_string(),
            ip,
            timestamp,
            config_id,
        }
    }
}

impl UnbanEvent {
    pub fn new(ip: String, timestamp: u64, config_id: String) -> Self {
        Self {
            event_id: Uuid::new_v4().to_string(),
            ip,
            timestamp,
            config_id,
        }
    }
}

