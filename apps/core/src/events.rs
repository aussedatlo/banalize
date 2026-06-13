use std::net::IpAddr;
use tokio::sync::{broadcast, mpsc};

/// Command sent to the firewall actor over a lossless mpsc channel.
/// The actor is the single owner of the iptables state, so every ban/unban
/// mutation goes through here rather than the lossy notification bus.
/// Commands carry the config id because every config owns its own child
/// chain — rules for the same IP under different configs are independent.
#[derive(Debug, Clone)]
pub enum FirewallCommand {
    Deny { config_id: String, ip: IpAddr },
    Allow { config_id: String, ip: IpAddr },
    /// Tear down a config's chain entirely (config deletion).
    RemoveChain { config_id: String },
}

#[derive(Debug, Clone)]
pub enum Event {
    Match {
        config_id: String,
        ip: String,
        timestamp: u64,
        /// The raw log line that matched, kept for the audit log and UI.
        line: String,
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

/// Buffer for the audit event channel. Bounded mpsc: lossless by contract —
/// if the SQLite writer ever falls this far behind, emitters block instead of
/// dropping audit events. The batched writer drains far faster than events
/// arrive, so the buffer absorbing a burst is the expected case and
/// backpressure the pathological one.
const EVENT_CHANNEL_CAPACITY: usize = 8192;

/// Buffer for the lossy notification bus feeding live SSE subscribers.
/// Unlike the audit mpsc, a slow subscriber lags and drops events rather
/// than backpressuring emitters — the UI treats these as refresh hints,
/// never as the source of truth.
const EVENT_BROADCAST_CAPACITY: usize = 1024;

pub struct EventEmitter {
    tx: mpsc::Sender<Event>,
    broadcast_tx: broadcast::Sender<Event>,
}

impl EventEmitter {
    pub fn new() -> (Self, mpsc::Receiver<Event>) {
        let (tx, rx) = mpsc::channel(EVENT_CHANNEL_CAPACITY);
        let (broadcast_tx, _) = broadcast::channel(EVENT_BROADCAST_CAPACITY);
        (Self { tx, broadcast_tx }, rx)
    }

    /// Emit an event for the durable audit log and live subscribers.
    pub async fn emit(&self, event: Event) {
        // No live subscribers: nobody to notify.
        let _ = self.broadcast_tx.send(event.clone());
        // Receiver gone (shutdown): nothing left to record.
        let _ = self.tx.send(event).await;
    }

    /// Subscribe to live event notifications (lossy under load).
    pub fn subscribe(&self) -> broadcast::Receiver<Event> {
        self.broadcast_tx.subscribe()
    }
}

