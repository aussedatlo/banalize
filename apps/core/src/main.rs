mod api;
mod cleaner;
mod config;
mod database;
mod events;
mod firewall;
mod ip_extract;
mod restore;
mod watcher;
mod watcher_manager;

use api::{create_router, AppState};
use cleaner::Cleaner;
use config::ConfigMap;
use database::{SqliteDatabase, SledDatabase};
use events::EventEmitter;
use firewall::Firewall;
use restore::restore_bans;
use std::env;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;
use tracing::{info, warn};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize logging
    let log_level = env::var("BANALIZE_CORE_LOG_LEVEL").unwrap_or_else(|_| "INFO".to_string());
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::new(&log_level))
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
    let sled_path = PathBuf::from(&database_path);
    let sqlite_configs_path = PathBuf::from(&database_path).join("configs.db");
    let sqlite_events_path = PathBuf::from(&database_path).join("events.db");

    // Ensure database directory exists
    std::fs::create_dir_all(&sled_path)?;

    // Initialize databases
    info!("Opening sled database at: {:?}", sled_path);
    let sled_db = Arc::new(SledDatabase::open(&sled_path)?);

    info!("Opening SQLite configs database at: {:?}", sqlite_configs_path);
    let sqlite_configs_db = Arc::new(tokio::sync::Mutex::new(SqliteDatabase::open(
        &sqlite_configs_path,
    )?));

    info!("Opening SQLite events database at: {:?}", sqlite_events_path);
    let sqlite_events_db = Arc::new(tokio::sync::Mutex::new(SqliteDatabase::open(
        &sqlite_events_path,
    )?));

    // Initialize firewall
    info!("Initializing firewall with chain: {}", firewall_chain);
    let mut firewall = Firewall::new(firewall_chain.clone());
    if let Err(e) = firewall.init() {
        warn!("Failed to initialize firewall (continuing anyway): {}", e);
    }
    let firewall = Arc::new(RwLock::new(firewall));

    // Initialize event emitter
    let (event_emitter, event_rx) = EventEmitter::new();
    let event_emitter = Arc::new(event_emitter);
    
    // Spawn SQLite event handler
    let sqlite_events_db_handler = sqlite_events_db.clone();
    let sqlite_rx = event_rx.resubscribe();
    tokio::spawn(async move {
        SqliteDatabase::handle_events(sqlite_events_db_handler, sqlite_rx).await;
    });
    
    // Spawn firewall event handler
    let firewall_handler = firewall.clone();
    let firewall_rx = event_rx.resubscribe();
    tokio::spawn(async move {
        Firewall::handle_events(firewall_handler, firewall_rx).await;
    });

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

    // Restore firewall bans from database
    restore_bans(sled_db.clone(), firewall.clone(), configs.clone()).await?;

    // Initialize watcher manager
    let watcher_manager = Arc::new(watcher_manager::WatcherManager::new(
        sled_db.clone(),
        event_emitter.clone(),
        firewall.clone(),
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
    let cleaner = Arc::new(Cleaner::new(
        sled_db.clone(),
        configs.clone(),
        event_emitter.clone(),
        30,
    )); // Run every 30 seconds

    // Setup signal handling
    let (shutdown_tx, _shutdown_rx) = broadcast::channel::<()>(16);
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
        sled_db: sled_db.clone(),
        configs: configs.clone(),
        watcher_manager: watcher_manager.clone(),
        event_emitter: event_emitter.clone(),
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

    // Stop cleaner
    let _ = shutdown_tx.send(());

    // Cleanup firewall
    {
        let mut fw = firewall.write().await;
        if let Err(e) = fw.cleanup() {
            warn!("Firewall cleanup error: {}", e);
        }
    }

    // Wait for tasks to complete
    let _ = tokio::time::timeout(tokio::time::Duration::from_secs(10), cleaner_handle).await;
    let _ = tokio::time::timeout(tokio::time::Duration::from_secs(5), server_handle).await;

    info!("Shutdown complete");

    Ok(())
}

