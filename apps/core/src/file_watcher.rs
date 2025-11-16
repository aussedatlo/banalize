use crate::config::Config;
use crate::database::CoreDatabase;
use crate::events::{BanEvent, MatchEvent};
use crate::firewall::Firewall;
use crate::event_emitter::EventEmitter;
use crate::ip_extract::IpExtractor;
use crate::ip_utils::is_ip_in_list;
use crate::time_utils::get_millis_timestamp;
use linemux::MuxedLines;
use std::sync::{Arc, Mutex};
use std::thread;
use tracing::{error, info};

pub struct FileWatcher {
    config: Arc<Config>,
    database: Arc<CoreDatabase>,
    firewall: Arc<Mutex<Firewall>>,
    event_emitter: Arc<EventEmitter>,
}

impl FileWatcher {
    pub fn new(
        config: Arc<Config>,
        database: Arc<CoreDatabase>,
        firewall: Arc<Mutex<Firewall>>,
        event_emitter: Arc<EventEmitter>,
    ) -> Self {
        info!("File watcher initialized: {}", config.param);
        Self {
            config,
            database,
            firewall,
            event_emitter,
        }
    }

    /// Process a matched IP address
    fn process_matched_ip(
        ip: &str,
        line: &str,
        config: &Config,
        database: &CoreDatabase,
        firewall: &Mutex<Firewall>,
        event_emitter: &EventEmitter,
    ) {
        let timestamp = get_millis_timestamp();

        // Count existing matches within find_time window
        let current_count = match database.count_matches(&config.id, ip, config.find_time) {
            Ok(count) => count,
            Err(e) => {
                error!("Failed to count matches from database: {}", e);
                return;
            }
        };

        // Add match to database
        if let Err(e) = database.add_match(&config.id, ip, timestamp) {
            error!("Failed to add match to database: {}", e);
            return;
        }

        // Emit match event
        let match_event = MatchEvent::new(
            line.to_string(),
            config.regex.clone(),
            ip.to_string(),
            timestamp,
            config.id.clone(),
        );
        event_emitter.emit_match(match_event);

        // Check if IP should be banned (after adding, count will be current_count + 1)
        if (current_count + 1) >= config.max_matches as usize {
            Self::apply_ban(ip, timestamp, config, database, firewall, event_emitter);
        }
    }

    /// Apply ban to an IP address
    fn apply_ban(
        ip: &str,
        timestamp: u64,
        config: &Config,
        database: &CoreDatabase,
        firewall: &Mutex<Firewall>,
        event_emitter: &EventEmitter,
    ) {
        // Check if already banned
        if let Ok(true) = database.is_banned(ip) {
            return;
        }

        info!("Banning IP: {} at timestamp: {}", ip, timestamp);

        // Add ban to database
        if let Err(e) = database.add_ban(&config.id, ip, timestamp) {
            error!("Failed to add ban to database: {}", e);
            return;
        }

        // Apply firewall rule synchronously
        if let Ok(mut fw) = firewall.lock() {
            if let Err(e) = fw.deny_ip_sync(ip) {
                error!("Failed to deny IP in firewall: {}", e);
            }
        } else {
            error!("Failed to acquire firewall lock");
        }

        // Emit ban event
        let ban_event = BanEvent::new(ip.to_string(), timestamp, config.id.clone());
        event_emitter.emit_ban(ban_event);
    }

    /// Run the file tailer thread
    fn run_tailer_thread(
        file_path_str: String,
        config: Arc<Config>,
        database: Arc<CoreDatabase>,
        firewall: Arc<Mutex<Firewall>>,
        event_emitter: Arc<EventEmitter>,
    ) {
        info!("Started file tailer for: {}", file_path_str);

        // Create a local single-threaded tokio runtime for linemux
        let rt = match tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
        {
            Ok(rt) => rt,
            Err(e) => {
                error!("Failed to create tokio runtime: {}", e);
                return;
            }
        };

        let mut ip_extractor = IpExtractor::new();

        rt.block_on(async {
            let mut lines = match MuxedLines::new() {
                Ok(l) => l,
                Err(e) => {
                    error!("Failed to create linemux: {}", e);
                    return;
                }
            };

            if let Err(e) = lines.add_file(&file_path_str).await {
                error!("Failed to add file to linemux: {}", e);
                return;
            }

            let mut line_count = 0u64;
            loop {
                match lines.next_line().await {
                    Ok(Some(line_entry)) => {
                        line_count += 1;
                        let line = line_entry.line();
                        
                        if line.is_empty() {
                            continue;
                        }

                        if let Some(ip) = ip_extractor.extract_ip(&config.regex, line) {
                            info!("Matched IP: {} from line #{}: {}", ip, line_count, line.trim());

                            if is_ip_in_list(&ip, &config.ignore_ips) {
                                continue;
                            }

                            Self::process_matched_ip(
                                &ip,
                                line,
                                &config,
                                &database,
                                &firewall,
                                &event_emitter,
                            );
                        }
                    }
                    Ok(None) => continue,
                    Err(e) => {
                        error!("Error reading line from linemux: {}", e);
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                }
            }
        });
    }

    pub async fn start(&self) -> anyhow::Result<()> {
        let file_path = self.config.file_path().ok_or_else(|| {
            anyhow::anyhow!("Config is not a file watcher")
        })?;

        info!("Starting file watcher for: {:?}", file_path);

        let config = self.config.clone();
        let database = self.database.clone();
        let firewall = self.firewall.clone();
        let event_emitter = self.event_emitter.clone();
        let file_path_str = file_path.to_string_lossy().to_string();

        // Spawn thread for file tailing with linemux
        let tailer_handle = thread::Builder::new()
            .name(format!("file-tailer-{}", config.id))
            .spawn(move || {
                Self::run_tailer_thread(file_path_str, config, database, firewall, event_emitter);
            })
            .map_err(|e| anyhow::anyhow!("Failed to spawn file tailer thread: {}", e))?;

        // Wait for thread to finish (it should run indefinitely)
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            if tailer_handle.is_finished() {
                error!("File tailer thread has terminated!");
                return Err(anyhow::anyhow!("File tailer thread terminated unexpectedly"));
            }
        }
    }
}

