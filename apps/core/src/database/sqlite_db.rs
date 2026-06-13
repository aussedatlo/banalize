use crate::events::Event;
use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigRecord {
    pub id: String,
    pub name: String,
    pub param: String,
    pub regex: String,
    pub ban_time: u64,
    pub find_time: u64,
    pub max_matches: u32,
    pub ignore_ips: String, // JSON array
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotifierRecord {
    pub id: String,
    pub events: String,                // JSON array of event types
    pub email_config: Option<String>,  // JSON object
    pub signal_config: Option<String>, // JSON object
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchEvent {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
    pub line: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BanEvent {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnbanEvent {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

/// Per-IP aggregate over the audit log (offender leaderboard).
#[derive(Debug, Clone, Serialize)]
pub struct IpStats {
    pub ip: String,
    pub match_count: u64,
    pub ban_count: u64,
    pub config_ids: Vec<String>,
    pub last_seen: u64,
}

pub struct SqliteDatabase {
    conn: Connection,
}

impl SqliteDatabase {
    pub fn open<P: AsRef<Path>>(path: P) -> SqliteResult<Self> {
        let conn = Connection::open(path)?;
        let db = Self { conn };
        db.init()?;
        Ok(db)
    }

    fn init(&self) -> SqliteResult<()> {
        // WAL + NORMAL sync: batched audit writes commit cheaply and API reads
        // proceed concurrently with the writer.
        self.conn
            .query_row("PRAGMA journal_mode=WAL", [], |_| Ok(()))?;
        self.conn.pragma_update(None, "synchronous", "NORMAL")?;

        // Create configs table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS configs (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                param TEXT NOT NULL,
                regex TEXT NOT NULL,
                ban_time INTEGER NOT NULL,
                find_time INTEGER NOT NULL,
                max_matches INTEGER NOT NULL,
                ignore_ips TEXT NOT NULL
            )",
            [],
        )?;

        // Create match_events table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS match_events (
                id TEXT PRIMARY KEY,
                config_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                line TEXT NOT NULL DEFAULT ''
            )",
            [],
        )?;
        // Databases created before the line column existed: add it in place.
        // The error on re-run ("duplicate column name") is expected and ignored.
        let _ = self.conn.execute(
            "ALTER TABLE match_events ADD COLUMN line TEXT NOT NULL DEFAULT ''",
            [],
        );

        // Create ban_events table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS ban_events (
                id TEXT PRIMARY KEY,
                config_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )",
            [],
        )?;

        // Create unban_events table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS unban_events (
                id TEXT PRIMARY KEY,
                config_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            )",
            [],
        )?;

        // Create notifiers table. The channel kind is derivable from which of
        // the two JSON columns is non-NULL.
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS notifiers (
                id TEXT PRIMARY KEY,
                events TEXT NOT NULL,
                email_config TEXT,
                signal_config TEXT
            )",
            [],
        )?;

        Ok(())
    }

    // Config operations
    pub fn insert_config(&self, config: &ConfigRecord) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO configs (id, name, param, regex, ban_time, find_time, max_matches, ignore_ips)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                config.id,
                config.name,
                config.param,
                config.regex,
                config.ban_time,
                config.find_time,
                config.max_matches,
                config.ignore_ips
            ],
        )?;
        Ok(())
    }

    pub fn get_config(&self, id: &str) -> SqliteResult<Option<ConfigRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, param, regex, ban_time, find_time, max_matches, ignore_ips
             FROM configs WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query_map(rusqlite::params![id], |row| {
            Ok(ConfigRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                param: row.get(2)?,
                regex: row.get(3)?,
                ban_time: row.get(4)?,
                find_time: row.get(5)?,
                max_matches: row.get(6)?,
                ignore_ips: row.get(7)?,
            })
        })?;

        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn get_all_configs(&self) -> SqliteResult<Vec<ConfigRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, param, regex, ban_time, find_time, max_matches, ignore_ips
             FROM configs"
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(ConfigRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                param: row.get(2)?,
                regex: row.get(3)?,
                ban_time: row.get(4)?,
                find_time: row.get(5)?,
                max_matches: row.get(6)?,
                ignore_ips: row.get(7)?,
            })
        })?;

        let mut configs = Vec::new();
        for row in rows {
            configs.push(row?);
        }
        Ok(configs)
    }

    pub fn delete_config(&self, id: &str) -> SqliteResult<()> {
        self.conn.execute("DELETE FROM configs WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    // Notifier operations
    pub fn insert_notifier(&self, notifier: &NotifierRecord) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO notifiers (id, events, email_config, signal_config)
             VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![
                notifier.id,
                notifier.events,
                notifier.email_config,
                notifier.signal_config
            ],
        )?;
        Ok(())
    }

    pub fn get_all_notifiers(&self) -> SqliteResult<Vec<NotifierRecord>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, events, email_config, signal_config FROM notifiers"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(NotifierRecord {
                id: row.get(0)?,
                events: row.get(1)?,
                email_config: row.get(2)?,
                signal_config: row.get(3)?,
            })
        })?;

        let mut notifiers = Vec::new();
        for row in rows {
            notifiers.push(row?);
        }
        Ok(notifiers)
    }

    pub fn delete_notifier(&self, id: &str) -> SqliteResult<()> {
        self.conn.execute("DELETE FROM notifiers WHERE id = ?1", rusqlite::params![id])?;
        Ok(())
    }

    // Event operations
    /// Persist a batch of audit events in a single transaction. One commit per
    /// batch is what lets the writer outrun the emitters: per-event commits
    /// were the bottleneck that made the old broadcast bus shed events.
    pub fn insert_events_batch(&self, events: &[Event]) -> SqliteResult<()> {
        let tx = self.conn.unchecked_transaction()?;
        {
            let insert = |table: &str, config_id: &str, ip: &str, timestamp: u64| {
                tx.prepare_cached(&format!(
                    "INSERT INTO {} (id, config_id, ip, timestamp) VALUES (?1, ?2, ?3, ?4)",
                    table
                ))?
                .execute(rusqlite::params![
                    Uuid::new_v4().to_string(),
                    config_id,
                    ip,
                    timestamp
                ])
                .map(|_| ())
            };
            for event in events {
                match event {
                    Event::Match { config_id, ip, timestamp, line } => {
                        tx.prepare_cached(
                            "INSERT INTO match_events (id, config_id, ip, timestamp, line) VALUES (?1, ?2, ?3, ?4, ?5)",
                        )?
                        .execute(rusqlite::params![
                            Uuid::new_v4().to_string(),
                            config_id,
                            ip,
                            timestamp,
                            line
                        ])
                        .map(|_| ())?
                    }
                    Event::Ban { config_id, ip, timestamp } => {
                        insert("ban_events", config_id, ip, *timestamp)?
                    }
                    Event::Unban { config_id, ip, timestamp } => {
                        insert("unban_events", config_id, ip, *timestamp)?
                    }
                }
            }
        }
        tx.commit()
    }


    fn map_match_event(row: &rusqlite::Row) -> rusqlite::Result<MatchEvent> {
        Ok(MatchEvent {
            id: row.get(0)?,
            config_id: row.get(1)?,
            ip: row.get(2)?,
            timestamp: row.get(3)?,
            line: row.get(4)?,
        })
    }

    pub fn get_match_events(&self, config_id: Option<&str>) -> SqliteResult<Vec<MatchEvent>> {
        let mut events = Vec::new();

        if let Some(cid) = config_id {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp, line FROM match_events WHERE config_id = ?1 ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map(rusqlite::params![cid], Self::map_match_event)?;
            for row in rows {
                events.push(row?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp, line FROM match_events ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map([], Self::map_match_event)?;
            for row in rows {
                events.push(row?);
            }
        }

        Ok(events)
    }

    fn map_ban_event(row: &rusqlite::Row) -> rusqlite::Result<BanEvent> {
        Ok(BanEvent {
            id: row.get(0)?,
            config_id: row.get(1)?,
            ip: row.get(2)?,
            timestamp: row.get(3)?,
        })
    }

    pub fn get_ban_event_by_id(&self, id: &str) -> SqliteResult<Option<BanEvent>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, config_id, ip, timestamp FROM ban_events WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query_map(rusqlite::params![id], Self::map_ban_event)?;
        
        if let Some(row) = rows.next() {
            Ok(Some(row?))
        } else {
            Ok(None)
        }
    }

    pub fn get_ban_events(&self, config_id: Option<&str>) -> SqliteResult<Vec<BanEvent>> {
        let mut events = Vec::new();
        
        if let Some(cid) = config_id {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp FROM ban_events WHERE config_id = ?1 ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map(rusqlite::params![cid], Self::map_ban_event)?;
            for row in rows {
                events.push(row?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp FROM ban_events ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map([], Self::map_ban_event)?;
            for row in rows {
                events.push(row?);
            }
        }
        
        Ok(events)
    }

    fn map_unban_event(row: &rusqlite::Row) -> rusqlite::Result<UnbanEvent> {
        Ok(UnbanEvent {
            id: row.get(0)?,
            config_id: row.get(1)?,
            ip: row.get(2)?,
            timestamp: row.get(3)?,
        })
    }

    pub fn get_unban_events(&self, config_id: Option<&str>) -> SqliteResult<Vec<UnbanEvent>> {
        let mut events = Vec::new();
        
        if let Some(cid) = config_id {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp FROM unban_events WHERE config_id = ?1 ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map(rusqlite::params![cid], Self::map_unban_event)?;
            for row in rows {
                events.push(row?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp FROM unban_events ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map([], Self::map_unban_event)?;
            for row in rows {
                events.push(row?);
            }
        }
        
        Ok(events)
    }

    /// Aggregate the audit log per IP: match/ban counts, distinct configs and
    /// most recent activity, heaviest offenders first, optionally restricted
    /// to one config and/or to events at or after `since` (ms epoch). The
    /// GROUP BY runs in SQLite so only unique IPs ever cross to the API — not
    /// the event rows.
    pub fn get_ip_stats(
        &self,
        config_id: Option<&str>,
        since: Option<u64>,
    ) -> SqliteResult<Vec<IpStats>> {
        use std::collections::HashMap;

        let mut stats: HashMap<String, IpStats> = HashMap::new();

        let mut collect = |sql: &str, is_match: bool| -> SqliteResult<()> {
            let mut stmt = self.conn.prepare(sql)?;
            let rows = stmt.query_map(rusqlite::params![config_id, since], |row| {
                let ip: String = row.get(0)?;
                let count: u64 = row.get(1)?;
                let last_seen: u64 = row.get(2)?;
                let config_ids: String = row.get(3)?;
                let entry = stats.entry(ip.clone()).or_insert_with(|| IpStats {
                    ip,
                    match_count: 0,
                    ban_count: 0,
                    config_ids: Vec::new(),
                    last_seen: 0,
                });
                if is_match {
                    entry.match_count = count;
                } else {
                    entry.ban_count = count;
                }
                entry.last_seen = entry.last_seen.max(last_seen);
                for cid in config_ids.split(',').filter(|s| !s.is_empty()) {
                    if !entry.config_ids.iter().any(|c| c == cid) {
                        entry.config_ids.push(cid.to_string());
                    }
                }
                Ok(())
            })?;
            for row in rows {
                row?;
            }
            Ok(())
        };

        collect(
            "SELECT ip, COUNT(*), MAX(timestamp), GROUP_CONCAT(DISTINCT config_id)
             FROM match_events
             WHERE (?1 IS NULL OR config_id = ?1) AND (?2 IS NULL OR timestamp >= ?2)
             GROUP BY ip",
            true,
        )?;
        collect(
            "SELECT ip, COUNT(*), MAX(timestamp), GROUP_CONCAT(DISTINCT config_id)
             FROM ban_events
             WHERE (?1 IS NULL OR config_id = ?1) AND (?2 IS NULL OR timestamp >= ?2)
             GROUP BY ip",
            false,
        )?;

        let mut result: Vec<IpStats> = stats.into_values().collect();
        result.sort_by(|a, b| {
            (b.match_count + b.ban_count, b.last_seen).cmp(&(a.match_count + a.ban_count, a.last_seen))
        });
        Ok(result)
    }

    /// Audit writer loop: drain the event channel in batches and persist each
    /// batch in one transaction.
    ///
    /// Bursts coalesce: after the first event arrives, the loop lingers
    /// briefly so followers join the same batch instead of paying one commit
    /// each. Bans and unbans skip the linger — they are rare and
    /// security-relevant, so they should be durable and API-visible
    /// immediately. The channel is lossless; once the senders drop at
    /// shutdown, the loop drains whatever is left and exits.
    pub async fn handle_events(db: Arc<Mutex<Self>>, mut rx: tokio::sync::mpsc::Receiver<Event>) {
        const BATCH_SIZE: usize = 256;
        const LINGER: std::time::Duration = std::time::Duration::from_millis(200);

        let only_matches = |buf: &[Event]| buf.iter().all(|e| matches!(e, Event::Match { .. }));

        let mut buf: Vec<Event> = Vec::with_capacity(BATCH_SIZE);
        loop {
            if rx.recv_many(&mut buf, BATCH_SIZE).await == 0 {
                break; // all senders gone
            }

            let deadline = tokio::time::sleep(LINGER);
            tokio::pin!(deadline);
            while buf.len() < BATCH_SIZE && only_matches(&buf) {
                let room = BATCH_SIZE - buf.len();
                tokio::select! {
                    _ = &mut deadline => break,
                    n = rx.recv_many(&mut buf, room) => {
                        if n == 0 {
                            break;
                        }
                    }
                }
            }

            let db = db.lock().await;
            if let Err(e) = db.insert_events_batch(&buf) {
                error!("Failed to persist {} audit events: {}", buf.len(), e);
            }
            drop(db);
            buf.clear();
        }
        info!("SQLite event handler shutting down");
    }
}

