use tokio::sync::broadcast;

#[derive(Debug, Clone)]
pub enum Event {
    Match {
        config_id: String,
        ip: String,
        timestamp: u64,
    },
    Ban {
        config_id: String,
        ip: String,
        timestamp: u64,
    },
    Unban {
        config_id: String,
        ip: String,
        timestamp: u64,
    },
}

pub struct EventEmitter {
    tx: broadcast::Sender<Event>,
}

impl EventEmitter {
    pub fn new() -> (Self, broadcast::Receiver<Event>) {
        let (tx, rx) = broadcast::channel(1024);
        (Self { tx }, rx)
    }

    /// Emit an event asynchronously (non-blocking)
    pub async fn emit(&self, event: Event) {
        // Ignore errors if there are no subscribers
        let _ = self.tx.send(event);
    }
}

