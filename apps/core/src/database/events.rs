use crate::events::types::{BanEvent, MatchEvent, UnbanEvent};
use rusqlite::{Connection, Result as SqliteResult};
use std::env;
use std::path::PathBuf;
use std::sync::Arc;
use std::sync::Mutex;
use tracing::info;

pub struct EventDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl EventDatabase {
    pub fn new() -> anyhow::Result<Self> {
        let base_path = env::var("BANALIZE_CORE_DATABASE_PATH")
            .unwrap_or_else(|_| "/tmp/banalize-core".to_string());
        let db_path = PathBuf::from(&base_path).join("events.db");
        
        // Create parent directory if it doesn't exist
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        
        db.init_schema()?;
        info!("Event database initialized at {:?}", db_path);
        
        Ok(db)
    }

    fn init_schema(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS match_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                config_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                line TEXT NOT NULL,
                regex TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS ban_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                config_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS unban_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                config_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            )",
            [],
        )?;

        // Create indexes for better query performance
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_match_events_config_id ON match_events(config_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_match_events_ip ON match_events(ip)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_match_events_timestamp ON match_events(timestamp)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ban_events_config_id ON ban_events(config_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ban_events_ip ON ban_events(ip)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_ban_events_timestamp ON ban_events(timestamp)",
            [],
        )?;

        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_unban_events_config_id ON unban_events(config_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_unban_events_ip ON unban_events(ip)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_unban_events_timestamp ON unban_events(timestamp)",
            [],
        )?;

        Ok(())
    }

    pub fn store_match_event(&self, event: &MatchEvent) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO match_events (event_id, config_id, ip, line, regex, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                event.event_id,
                event.config_id,
                event.ip,
                event.line,
                event.regex,
                event.timestamp
            ],
        )?;
        Ok(())
    }

    pub fn store_ban_event(&self, event: &BanEvent) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO ban_events (event_id, config_id, ip, timestamp)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                event.event_id,
                event.config_id,
                event.ip,
                event.timestamp
            ],
        )?;
        Ok(())
    }

    pub fn store_unban_event(&self, event: &UnbanEvent) -> anyhow::Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO unban_events (event_id, config_id, ip, timestamp)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                event.event_id,
                event.config_id,
                event.ip,
                event.timestamp
            ],
        )?;
        Ok(())
    }
}

