use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::Path;

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
pub struct MatchEvent {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
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
                timestamp INTEGER NOT NULL
            )",
            [],
        )?;

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

    // Event operations
    pub fn insert_match_event(&self, event: &MatchEvent) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT INTO match_events (id, config_id, ip, timestamp) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![event.id, event.config_id, event.ip, event.timestamp],
        )?;
        Ok(())
    }

    pub fn insert_ban_event(&self, event: &BanEvent) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT INTO ban_events (id, config_id, ip, timestamp) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![event.id, event.config_id, event.ip, event.timestamp],
        )?;
        Ok(())
    }

    pub fn insert_unban_event(&self, event: &UnbanEvent) -> SqliteResult<()> {
        self.conn.execute(
            "INSERT INTO unban_events (id, config_id, ip, timestamp) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![event.id, event.config_id, event.ip, event.timestamp],
        )?;
        Ok(())
    }

    fn map_match_event(row: &rusqlite::Row) -> rusqlite::Result<MatchEvent> {
        Ok(MatchEvent {
            id: row.get(0)?,
            config_id: row.get(1)?,
            ip: row.get(2)?,
            timestamp: row.get(3)?,
        })
    }

    pub fn get_match_events(&self, config_id: Option<&str>) -> SqliteResult<Vec<MatchEvent>> {
        let mut events = Vec::new();
        
        if let Some(cid) = config_id {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp FROM match_events WHERE config_id = ?1 ORDER BY timestamp DESC"
            )?;
            let rows = stmt.query_map(rusqlite::params![cid], Self::map_match_event)?;
            for row in rows {
                events.push(row?);
            }
        } else {
            let mut stmt = self.conn.prepare(
                "SELECT id, config_id, ip, timestamp FROM match_events ORDER BY timestamp DESC"
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
}

