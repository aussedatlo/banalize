mod api;
mod cleaner;
mod config;
mod database;
mod detector;
mod events;
mod firewall;
mod geoip;
mod ip_extract;
mod log_capture;
mod log_source;
mod notifier;
mod restore;
mod store;
mod watcher_manager;

use api::{create_router, AppState};
use cleaner::Cleaner;
use config::ConfigMap;
use database::SqliteDatabase;
use events::{EventEmitter, FirewallCommand};
use firewall::Firewall;
use restore::restore_state;
use store::MemoryStore;
use log_capture::{LogBuffer, LogCaptureLayer, LOG_BUFFER_CAPACITY};
use std::collections::VecDeque;
use std::env;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tokio::sync::{broadcast, mpsc, RwLock};
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging with an in-memory capture layer for the /api/logs endpoint
    let log_level = env::var("BANALIZE_CORE_LOG_LEVEL").unwrap_or_else(|_| "INFO".to_string());
    let log_buffer: LogBuffer = Arc::new(Mutex::new(VecDeque::with_capacity(LOG_BUFFER_CAPACITY)));
    let (log_tx, _) = broadcast::channel::<log_capture::LogEntry>(1024);

    tracing_subscriber::registry()
        .with(EnvFilter::new(&log_level))
        .with(tracing_subscriber::fmt::layer())
        .with(LogCaptureLayer::new(log_buffer.clone(), log_tx.clone()))
        .init();

    info!("Starting banalize-core");

    // Get configuration from environment
    let firewall_chain = env::var("BANALIZE_CORE_FIREWALL_CHAIN")
        .unwrap_or_else(|_| "INPUT".to_string());
    let database_path = env::var("BANALIZE_CORE_DATABASE_PATH")
        .unwrap_or_else(|_| "/tmp/banalize-core".to_string());
    let api_addr = env::var("BANALIZE_CORE_API_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:5040".to_string());

    // Create database paths
    let db_dir = PathBuf::from(&database_path);
    let sqlite_configs_path = db_dir.join("configs.db");
    let sqlite_events_path = db_dir.join("events.db");

    // Ensure database directory exists
    std::fs::create_dir_all(&db_dir)?;

    // In-memory runtime state (hot path); SQLite below is the durable mirror.
    let store = Arc::new(MemoryStore::new());

    // Initialize databases
    info!("Opening SQLite configs database at: {:?}", sqlite_configs_path);
    let sqlite_configs_db = Arc::new(tokio::sync::Mutex::new(SqliteDatabase::open(
        &sqlite_configs_path,
    )?));

    info!("Opening SQLite events database at: {:?}", sqlite_events_path);
    let sqlite_events_db = Arc::new(tokio::sync::Mutex::new(SqliteDatabase::open(
        &sqlite_events_path,
    )?));

    // Setup the shutdown broadcast early so long-lived actors can subscribe.
    let (shutdown_tx, _shutdown_rx) = broadcast::channel::<()>(16);

    // Initialize the firewall and spawn it as the single owner of the iptables
    // chain. All ban/unban mutations reach it over a lossless mpsc channel.
    info!("Initializing firewall with chain: {}", firewall_chain);
    let mut firewall = Firewall::new(firewall_chain.clone());
    if let Err(e) = firewall.init() {
        warn!("Failed to initialize firewall (continuing anyway): {}", e);
    }
    let (firewall_tx, firewall_rx) = mpsc::channel::<FirewallCommand>(1024);
    {
        let fw_shutdown_rx = shutdown_tx.subscribe();
        tokio::spawn(async move {
            firewall.run(firewall_rx, fw_shutdown_rx).await;
        });
    }

    // Initialize event emitter
    let (event_emitter, event_rx) = EventEmitter::new();
    let event_emitter = Arc::new(event_emitter);

    // Spawn SQLite event handler (the sole consumer of the notification bus).
    let sqlite_events_db_handler = sqlite_events_db.clone();
    tokio::spawn(async move {
        SqliteDatabase::handle_events(sqlite_events_db_handler, event_rx).await;
    });

    // GeoIP country lookup: loads an existing mmdb immediately; the background
    // task downloads/refreshes it (no-op when auto-download is disabled).
    let geoip = Arc::new(geoip::GeoIp::new(&db_dir));
    tokio::spawn(geoip.clone().run());

    // Initialize config map
    let configs: Arc<RwLock<ConfigMap>> = Arc::new(RwLock::new(ConfigMap::new()));

    // Load existing configs from SQLite
    {
        let db = sqlite_configs_db.lock().await;
        let existing_configs = db.get_all_configs()?;
        let mut config_map = configs.write().await;
        for config_record in existing_configs {
            let ignore_ips: Vec<String> =
                serde_json::from_str(&config_record.ignore_ips).unwrap_or_default();
            let config = config::Config {
                id: config_record.id.clone(),
                name: config_record.name,
                param: config_record.param,
                regex: config_record.regex,
                ban_time: config_record.ban_time,
                find_time: config_record.find_time,
                max_matches: config_record.max_matches,
                ignore_ips,
            };
            config_map.insert(config_record.id, config);
        }
    }

    // Load notifier configs from SQLite; rows that no longer parse or validate
    // are skipped so one bad record can't take the others down.
    let notifiers: Arc<RwLock<Vec<notifier::NotifierConfig>>> = {
        let db = sqlite_configs_db.lock().await;
        let loaded: Vec<notifier::NotifierConfig> = db
            .get_all_notifiers()?
            .into_iter()
            .filter_map(|record| {
                let config = notifier::NotifierConfig {
                    id: record.id.clone(),
                    events: serde_json::from_str(&record.events).ok()?,
                    email_config: record
                        .email_config
                        .as_deref()
                        .and_then(|j| serde_json::from_str(j).ok()),
                    signal_config: record
                        .signal_config
                        .as_deref()
                        .and_then(|j| serde_json::from_str(j).ok()),
                };
                if let Err(e) = config.validate() {
                    warn!("Skipping invalid notifier {}: {}", record.id, e);
                    return None;
                }
                Some(config)
            })
            .collect();
        info!("Loaded {} notifier(s)", loaded.len());
        Arc::new(RwLock::new(loaded))
    };

    // Spawn the notification dispatcher on the lossy event bus.
    tokio::spawn(notifier::run_dispatcher(
        event_emitter.subscribe(),
        shutdown_tx.subscribe(),
        notifiers.clone(),
        configs.clone(),
        store.clone(),
        geoip.clone(),
    ));

    // Hydrate in-memory state from the durable store and re-apply active bans.
    restore_state(
        sqlite_events_db.clone(),
        store.clone(),
        firewall_tx.clone(),
        configs.clone(),
    )
    .await?;

    // Initialize watcher manager
    let watcher_manager = Arc::new(watcher_manager::WatcherManager::new(
        store.clone(),
        event_emitter.clone(),
        firewall_tx.clone(),
    ));

    // Start watchers for existing configs
    {
        let configs_read = configs.read().await;
        for (_, config) in configs_read.iter() {
            if let Err(e) = watcher_manager.start_watcher(config.clone()).await {
                warn!("Failed to start watcher for config {}: {}", config.id, e);
            }
        }
    }

    // Initialize cleaner
    let cleaner_interval = env::var("BANALIZE_CORE_CLEANER_INTERVAL")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(30);
    let cleaner = Arc::new(Cleaner::new(
        store.clone(),
        configs.clone(),
        event_emitter.clone(),
        firewall_tx.clone(),
        cleaner_interval,
    ));

    // Setup signal handling
    let shutdown_tx_cleaner = shutdown_tx.clone();

    // Spawn cleaner task
    let cleaner_handle = {
        let cleaner = cleaner.clone();
        let shutdown_rx_cleaner = shutdown_tx_cleaner.subscribe();
        tokio::spawn(async move {
            cleaner.run(shutdown_rx_cleaner).await;
        })
    };

    // Setup graceful shutdown
    let shutdown_tx_api = shutdown_tx.clone();
    tokio::spawn(async move {
        let ctrl_c = async {
            tokio::signal::ctrl_c()
                .await
                .expect("Failed to install Ctrl+C handler");
        };

        #[cfg(unix)]
        let terminate = async {
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("Failed to install signal handler")
                .recv()
                .await;
        };

        #[cfg(not(unix))]
        let terminate = std::future::pending::<()>();

        tokio::select! {
            _ = ctrl_c => {
                info!("Received Ctrl+C, shutting down...");
            }
            _ = terminate => {
                info!("Received SIGTERM, shutting down...");
            }
        }

        let _ = shutdown_tx_api.send(());
    });

    // Create app state
    let app_state = AppState {
        sqlite_configs_db: sqlite_configs_db.clone(),
        sqlite_events_db: sqlite_events_db.clone(),
        store: store.clone(),
        configs: configs.clone(),
        watcher_manager: watcher_manager.clone(),
        event_emitter: event_emitter.clone(),
        firewall_tx: firewall_tx.clone(),
        log_buffer: log_buffer.clone(),
        log_tx: log_tx.clone(),
        geoip: geoip.clone(),
        notifiers: notifiers.clone(),
    };

    // Create API router
    let app = create_router(app_state).layer(
        ServiceBuilder::new()
            .layer(CorsLayer::permissive())
            .into_inner(),
    );

    // Start API server
    info!("Starting API server on {}", api_addr);
    let shutdown_rx_server = shutdown_tx.subscribe();
    let server_handle = tokio::spawn(async move {
        let listener = tokio::net::TcpListener::bind(&api_addr).await?;
        let mut shutdown_rx = shutdown_rx_server;
        axum::serve(listener, app)
            .with_graceful_shutdown(async move {
                shutdown_rx.recv().await.ok();
            })
            .await?;
        Ok::<(), Box<dyn std::error::Error + Send + Sync>>(())
    });

    // Wait for shutdown signal
    let mut shutdown_rx_main = shutdown_tx.subscribe();
    let _ = shutdown_rx_main.recv().await;

    info!("Shutting down...");

    // Stop all watchers
    watcher_manager.stop_all().await;

    // Stop cleaner and the firewall actor (the actor flushes the chain on
    // shutdown). Idempotent if the signal handler already sent this.
    let _ = shutdown_tx.send(());

    // Wait for tasks to complete
    let _ = tokio::time::timeout(tokio::time::Duration::from_secs(10), cleaner_handle).await;
    let _ = tokio::time::timeout(tokio::time::Duration::from_secs(5), server_handle).await;

    info!("Shutdown complete");

    Ok(())
}

