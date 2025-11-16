use crate::database::{BanEvent, MatchEvent, SqliteDatabase, UnbanEvent};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info};
use uuid::Uuid;

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
    sqlite_db: Arc<Mutex<SqliteDatabase>>,
}

impl EventEmitter {
    pub fn new(sqlite_db: Arc<Mutex<SqliteDatabase>>) -> Self {
        Self { sqlite_db }
    }

    /// Emit an event asynchronously (non-blocking)
    pub async fn emit(&self, event: Event) {
        let db = self.sqlite_db.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::handle_event(db, event).await {
                error!("Failed to handle event: {}", e);
            }
        });
    }

    async fn handle_event(
        db: Arc<Mutex<SqliteDatabase>>,
        event: Event,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        match event {
            Event::Match {
                config_id,
                ip,
                timestamp,
            } => {
                let event = MatchEvent {
                    id: Uuid::new_v4().to_string(),
                    config_id,
                    ip,
                    timestamp,
                };
                let db = db.lock().await;
                db.insert_match_event(&event)?;
                info!("Emitted match event: {} -> {}", event.config_id, event.ip);
            }
            Event::Ban {
                config_id,
                ip,
                timestamp,
            } => {
                let event = BanEvent {
                    id: Uuid::new_v4().to_string(),
                    config_id,
                    ip,
                    timestamp,
                };
                let db = db.lock().await;
                db.insert_ban_event(&event)?;
                info!("Emitted ban event: {} -> {}", event.config_id, event.ip);
            }
            Event::Unban {
                config_id,
                ip,
                timestamp,
            } => {
                let event = UnbanEvent {
                    id: Uuid::new_v4().to_string(),
                    config_id,
                    ip,
                    timestamp,
                };
                let db = db.lock().await;
                db.insert_unban_event(&event)?;
                info!("Emitted unban event: {} -> {}", event.config_id, event.ip);
            }
        }
        Ok(())
    }
}

