use std::time::{SystemTime, UNIX_EPOCH};

pub fn get_millis_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
}

