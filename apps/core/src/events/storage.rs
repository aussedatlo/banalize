use crate::database::events::EventDatabase;
use crate::events::emitter::EventReceiver;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;
use tokio::task;
use tracing::error;

/// Background service that listens to event receiver and stores events in SQLite
pub struct EventStorageService {
    event_receiver: Arc<Mutex<EventReceiver>>,
    event_db: Arc<EventDatabase>,
    shutdown: Arc<AtomicBool>,
}

impl EventStorageService {
    pub fn new(event_receiver: Arc<Mutex<EventReceiver>>, event_db: Arc<EventDatabase>) -> Self {
        Self {
            event_receiver,
            event_db,
            shutdown: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn shutdown(&self) {
        self.shutdown.store(true, Ordering::Relaxed);
    }

    pub async fn start(&self) -> anyhow::Result<()> {
        let event_receiver = self.event_receiver.clone();
        let event_db = self.event_db.clone();
        let shutdown = self.shutdown.clone();

        // Spawn a blocking task to handle event storage
        task::spawn_blocking(move || {
            while !shutdown.load(Ordering::Relaxed) {
                // Hold the lock for the entire iteration to access receivers
                let receiver = event_receiver.lock().unwrap();
                let match_rx = receiver.get_match_receiver();
                let ban_rx = receiver.get_ban_receiver();
                let unban_rx = receiver.get_unban_receiver();

                // Try to receive match events
                while let Ok(event) = match_rx.try_recv() {
                    if let Err(e) = event_db.store_match_event(&event) {
                        error!("Failed to store match event: {}", e);
                    }
                }

                // Try to receive ban events
                while let Ok(event) = ban_rx.try_recv() {
                    if let Err(e) = event_db.store_ban_event(&event) {
                        error!("Failed to store ban event: {}", e);
                    }
                }

                // Try to receive unban events
                while let Ok(event) = unban_rx.try_recv() {
                    if let Err(e) = event_db.store_unban_event(&event) {
                        error!("Failed to store unban event: {}", e);
                    }
                }

                // Drop the lock before sleeping
                drop(receiver);
                
                // Sleep briefly to avoid busy-waiting
                std::thread::sleep(Duration::from_millis(10));
            }
        });

        Ok(())
    }
}

