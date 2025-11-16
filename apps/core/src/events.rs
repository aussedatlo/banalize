use crate::database::{BanEvent, MatchEvent, SqliteDatabase, UnbanEvent};
use crate::firewall::Firewall;
use std::net::IpAddr;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use tracing::{error, info, warn};
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
    firewall: Arc<RwLock<Firewall>>,
}

impl EventEmitter {
    pub fn new(
        sqlite_db: Arc<Mutex<SqliteDatabase>>,
        firewall: Arc<RwLock<Firewall>>,
    ) -> Self {
        Self { sqlite_db, firewall }
    }

    /// Emit an event asynchronously (non-blocking)
    pub async fn emit(&self, event: Event) {
        let db = self.sqlite_db.clone();
        let firewall = self.firewall.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::handle_event(db, firewall, event).await {
                error!("Failed to handle event: {}", e);
            }
        });
    }

    async fn handle_event(
        db: Arc<Mutex<SqliteDatabase>>,
        firewall: Arc<RwLock<Firewall>>,
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
                // Remove firewall rule first
                if let Ok(ip_addr) = ip.parse::<IpAddr>() {
                    let fw = firewall.read().await;
                    if let Err(e) = fw.allow_ip_sync(&ip_addr) {
                        warn!("Failed to remove firewall rule for unban {}: {}", ip, e);
                        // Continue anyway, we'll still create the unban event
                    }
                }
                
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

