use crate::events::types::{BanEvent, MatchEvent, UnbanEvent};
use crossbeam_channel::{unbounded, Receiver, Sender};
use tracing::warn;

/// Event emitter for async, non-blocking event dispatch
pub struct EventEmitter {
    match_tx: Sender<MatchEvent>,
    ban_tx: Sender<BanEvent>,
    unban_tx: Sender<UnbanEvent>,
}

impl EventEmitter {
    pub fn new() -> (Self, EventReceiver) {
        let (match_tx, match_rx) = unbounded();
        let (ban_tx, ban_rx) = unbounded();
        let (unban_tx, unban_rx) = unbounded();

        let emitter = Self {
            match_tx,
            ban_tx,
            unban_tx,
        };

        let receiver = EventReceiver {
            match_rx,
            ban_rx,
            unban_rx,
        };

        (emitter, receiver)
    }

    /// Emit a match event (non-blocking)
    pub fn emit_match(&self, event: MatchEvent) {
        if let Err(_) = self.match_tx.send(event) {
            warn!("Failed to emit match event (receiver dropped)");
        }
    }

    /// Emit a ban event (non-blocking)
    pub fn emit_ban(&self, event: BanEvent) {
        if let Err(_) = self.ban_tx.send(event) {
            warn!("Failed to emit ban event (receiver dropped)");
        }
    }

    /// Emit an unban event (non-blocking)
    pub fn emit_unban(&self, event: UnbanEvent) {
        if let Err(_) = self.unban_tx.send(event) {
            warn!("Failed to emit unban event (receiver dropped)");
        }
    }
}

pub struct EventReceiver {
    match_rx: Receiver<MatchEvent>,
    ban_rx: Receiver<BanEvent>,
    unban_rx: Receiver<UnbanEvent>,
}

impl EventReceiver {
    pub fn get_match_receiver(&self) -> &Receiver<MatchEvent> {
        &self.match_rx
    }

    pub fn get_ban_receiver(&self) -> &Receiver<BanEvent> {
        &self.ban_rx
    }

    pub fn get_unban_receiver(&self) -> &Receiver<UnbanEvent> {
        &self.unban_rx
    }
}

