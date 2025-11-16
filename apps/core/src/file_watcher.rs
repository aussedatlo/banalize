use crate::config::Config;
use crate::database::CoreDatabase;
use crate::events::{BanEvent, MatchEvent};
use crate::firewall::Firewall;
use crate::event_emitter::EventEmitter;
use crate::ip_extract::IpExtractor;
use crate::ip_utils::is_ip_in_list;
use crate::time_utils::get_millis_timestamp;
use crossbeam_channel::unbounded;
use linemux::MuxedLines;
use std::sync::{Arc, Mutex};
use std::thread;
use thread_priority::{set_current_thread_priority, ThreadPriority};
use tracing::{error, info, warn};

/// Events sent from high-priority thread to background tasks
#[derive(Debug, Clone)]
pub enum BackgroundEvent {
    Match(MatchEvent),
    Ban(BanEvent),
}

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
        Self {
            config,
            database,
            firewall,
            event_emitter,
        }
    }

    /// Process a matched IP address - critical path for ban detection
    fn process_matched_ip(
        ip: &str,
        line: &str,
        config: &Config,
        database: &CoreDatabase,
        firewall: &Mutex<Firewall>,
        background_tx: &crossbeam_channel::Sender<BackgroundEvent>,
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

        // Check if IP should be banned (after adding, count will be current_count + 1)
        let should_ban = (current_count + 1) >= config.max_matches as usize;

        // Send match event to background task (non-blocking)
        let match_event = MatchEvent::new(
            line.to_string(),
            config.regex.clone(),
            ip.to_string(),
            timestamp,
            config.id.clone(),
        );
        let _ = background_tx.send(BackgroundEvent::Match(match_event.clone()));

        if should_ban {
            Self::apply_ban(ip, timestamp, config, database, firewall, background_tx);
        }
    }

    /// Apply ban to an IP address - critical path for firewall deny
    fn apply_ban(
        ip: &str,
        timestamp: u64,
        config: &Config,
        database: &CoreDatabase,
        firewall: &Mutex<Firewall>,
        background_tx: &crossbeam_channel::Sender<BackgroundEvent>,
    ) {
        // Check if already banned
        if let Ok(true) = database.is_banned(ip) {
            return;
        }

        info!("Banning IP: {} at timestamp: {}", ip, timestamp);

        // Add ban to database
        if let Err(e) = database.add_ban(ip, timestamp) {
            error!("Failed to add ban to database: {}", e);
            return;
        }

        // CRITICAL PATH: Apply firewall rule synchronously
        if let Ok(mut fw) = firewall.lock() {
            if let Err(e) = fw.deny_ip_sync(ip) {
                error!("Failed to deny IP in firewall: {}", e);
            }
        } else {
            error!("Failed to acquire firewall lock");
        }

        // Send ban event to background task (non-blocking)
        let ban_event = BanEvent::new(ip.to_string(), timestamp, config.id.clone());
        let _ = background_tx.send(BackgroundEvent::Ban(ban_event));
    }

    /// Setup and run the high-priority file tailer thread
    fn run_tailer_thread(
        file_path_str: String,
        config: Arc<Config>,
        database: Arc<CoreDatabase>,
        firewall: Arc<Mutex<Firewall>>,
        background_tx: crossbeam_channel::Sender<BackgroundEvent>,
    ) {
        // Set thread priority to maximum
        if let Err(e) = set_current_thread_priority(ThreadPriority::Max) {
            warn!("Failed to set thread priority: {:?}. Continuing with default priority.", e);
        } else {
            info!("Set file tailer thread to maximum priority");
        }

        info!("Started high-priority file tailer for: {}", file_path_str);

        // Create a local single-threaded tokio runtime for linemux (async-only)
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

        // Create IP extractor (one per thread, no locking needed)
        let mut ip_extractor = IpExtractor::new();

        // Run linemux in the local runtime
        rt.block_on(async {
            // Initialize linemux
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

            info!("Using linemux for high-performance file tailing");

            // Main tailing loop - this is the critical path
            let mut line_count = 0u64;
            loop {
                match lines.next_line().await {
                    Ok(Some(line_entry)) => {
                        line_count += 1;
                        let line = line_entry.line();
                        
                        if line.is_empty() {
                            continue;
                        }

                        // Extract IP from line using compiled regex (critical path)
                        if let Some(ip) = ip_extractor.extract_ip(&config.regex, line) {
                            info!("Matched IP: {} from line #{}: {}", ip, line_count, line.trim());

                            // Check if IP is in ignore list
                            if is_ip_in_list(&ip, &config.ignore_ips) {
                                continue;
                            }

                            Self::process_matched_ip(
                                &ip,
                                line,
                                &config,
                                &database,
                                &firewall,
                                &background_tx,
                            );
                        }
                    }
                    Ok(None) => {
                        // No line available, continue
                        continue;
                    }
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

        // Create channel for background events
        let (background_tx, background_rx) = unbounded::<BackgroundEvent>();
        
        // Clone necessary data for the high-priority thread
        let config = self.config.clone();
        let database = self.database.clone();
        let firewall = self.firewall.clone();
        let file_path_str = file_path.to_string_lossy().to_string();
        let event_emitter = self.event_emitter.clone();

        // Spawn high-priority thread for file tailing with linemux
        let tailer_handle = thread::Builder::new()
            .name(format!("file-tailer-{}", config.id))
            .spawn(move || {
                Self::run_tailer_thread(file_path_str, config, database, firewall, background_tx);
            })
            .map_err(|e| anyhow::anyhow!("Failed to spawn file tailer thread: {}", e))?;

        // Spawn background task to handle non-critical operations (event emission)
        Self::spawn_background_event_processor(event_emitter, background_rx);

        // Keep the watcher alive
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
            
            // Check if tailer thread is still alive
            if tailer_handle.is_finished() {
                error!("File tailer thread has terminated!");
                return Err(anyhow::anyhow!("File tailer thread terminated unexpectedly"));
            }
        }
    }

    /// Spawn background task to handle non-critical event operations
    fn spawn_background_event_processor(
        event_emitter: Arc<EventEmitter>,
        background_rx: crossbeam_channel::Receiver<BackgroundEvent>,
    ) {
        tokio::spawn(async move {
            info!("Started background event processor");
            while let Ok(event) = background_rx.recv() {
                match event {
                    BackgroundEvent::Match(event) => {
                        event_emitter.emit_match(event);
                    }
                    BackgroundEvent::Ban(event) => {
                        event_emitter.emit_ban(event);
                    }
                }
            }
        });
    }
}

