mod config;
mod config_manager;
mod database;
mod event_emitter;
mod events;
mod file_watcher;
mod firewall;
mod grpc_server;
mod ip_extract;
mod ip_utils;
mod time_utils;
mod watcher_manager;
mod cleaner;

use config_manager::ConfigManager;
use database::CoreDatabase;
use event_emitter::EventEmitter;
use firewall::Firewall;
use grpc_server::{create_core_server, create_events_server};
use std::env;
use std::sync::Arc;
use std::sync::Mutex;
#[cfg(unix)]
use tokio::signal::unix::{signal as unix_signal, SignalKind};
use tonic::transport::Server;
use tracing::{error, info};

/// Format duration in milliseconds to human-readable string
fn format_duration(ms: u64) -> String {
    if ms < 1000 {
        format!("{} ms", ms)
    } else if ms < 60_000 {
        let seconds = ms / 1000;
        format!("{} second{}", seconds, if seconds == 1 { "" } else { "s" })
    } else if ms < 3_600_000 {
        let minutes = ms / 60_000;
        let seconds = (ms % 60_000) / 1000;
        if seconds == 0 {
            format!("{} minute{}", minutes, if minutes == 1 { "" } else { "s" })
        } else {
            format!(
                "{} minute{} {} second{}",
                minutes,
                if minutes == 1 { "" } else { "s" },
                seconds,
                if seconds == 1 { "" } else { "s" }
            )
        }
    } else {
        let hours = ms / 3_600_000;
        let minutes = (ms % 3_600_000) / 60_000;
        if minutes == 0 {
            format!("{} hour{}", hours, if hours == 1 { "" } else { "s" })
        } else {
            format!(
                "{} hour{} {} minute{}",
                hours,
                if hours == 1 { "" } else { "s" },
                minutes,
                if minutes == 1 { "" } else { "s" }
            )
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    let log_level = env::var("BANALIZE_CORE_LOG_LEVEL")
        .unwrap_or_else(|_| "INFO".to_string())
        .to_uppercase();
    
    let env_filter = match log_level.as_str() {
        "INFO" => tracing_subscriber::EnvFilter::new("info"),
        "DEBUG" => tracing_subscriber::EnvFilter::new("debug"),
        "ERROR" => tracing_subscriber::EnvFilter::new("error"),
        _ => {
            eprintln!("Invalid BANALIZE_CORE_LOG_LEVEL value: {}. Must be INFO, DEBUG, or ERROR. Defaulting to INFO.", log_level);
            tracing_subscriber::EnvFilter::new("info")
        }
    };
    
    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .init();

    info!("Starting banalize-core");

    // Initialize database
    let database = Arc::new(CoreDatabase::new()?);
    info!("Database initialized");

    // Initialize firewall
    let firewall = Arc::new(Mutex::new(Firewall::new()));
    {
        let fw = firewall.lock().unwrap();
        if let Err(e) = fw.init() {
            error!("Failed to initialize firewall: {:?}", e);
            // Continue anyway - firewall errors are ignored per spec
        } else {
            info!("Firewall initialized");
        }
    }

    // Restore bans from database on startup
    {
        let bans = match database.get_all_bans() {
            Ok(b) => b,
            Err(e) => {
                error!("Failed to get bans for restore: {}", e);
                Vec::new()
            }
        };
        
        if !bans.is_empty() {
            let ips: Vec<String> = bans.iter().map(|b| b.ip.clone()).collect();
            let mut fw = firewall.lock().unwrap();
            if let Err(e) = fw.restore_bans(&ips) {
                error!("Failed to restore bans: {}", e);
            }
        }
    }

    // Initialize event emitter
    let (event_emitter, event_receiver) = EventEmitter::new();
    let event_emitter = Arc::new(event_emitter);
    let event_receiver = Arc::new(Mutex::new(event_receiver));
    info!("Event emitter initialized");

    // Initialize config manager (loads configs from database)
    let config_manager = Arc::new(ConfigManager::new(database.clone())?);
    info!("Config manager initialized");

    // Initialize watcher manager
    let watcher_manager = Arc::new(watcher_manager::WatcherManager::new(
        config_manager.clone(),
        database.clone(),
        firewall.clone(),
        event_emitter.clone(),
    ));
    info!("Watcher manager initialized");

    // Start watchers for all loaded configs
    let configs = config_manager.list_configs();
    let config_count = configs.len();
    
    // Log all configs with human-readable values
    if config_count > 0 {
        info!("Loaded {} configuration(s):", config_count);
        for config in &configs {
            let ban_time_str = format_duration(config.ban_time);
            let find_time_str = format_duration(config.find_time);
            let ignore_ips_str = if config.ignore_ips.is_empty() {
                "none".to_string()
            } else {
                config.ignore_ips.join(", ")
            };
            
            info!(
                "  Config: {} (ID: {})\n    Path: {}\n    Regex: {}\n    Ban Time: {} ({} ms)\n    Find Time: {} ({} ms)\n    Max Matches: {}\n    Ignore IPs: {}",
                config.name,
                config.id,
                config.param,
                config.regex,
                ban_time_str,
                config.ban_time,
                find_time_str,
                config.find_time,
                config.max_matches,
                ignore_ips_str
            );
        }
    }
    
    for config in configs {
        let config_id = config.id.clone();
        let watcher_manager_clone = watcher_manager.clone();
        tokio::spawn(async move {
            if let Err(e) = watcher_manager_clone.start_watcher(&config_id).await {
                error!("Failed to start watcher for config {}: {}", config_id, e);
            }
        });
    }
    if config_count > 0 {
        info!("Starting {} watcher(s) for loaded configs", config_count);
    }

    // Initialize cleaner
    let cleaner = cleaner::Cleaner::new(
        config_manager.get_configs_arc(),
        database.clone(),
        firewall.clone(),
        event_emitter.clone(),
    );
    info!("Cleaner initialized");

    // Start cleaner in background
    let cleaner_handle = tokio::spawn(async move {
        if let Err(e) = cleaner.start().await {
            error!("Cleaner stopped with error: {:?}", e);
        }
    });

    // Event receiver is now used by the gRPC events service
    // No need for a separate event processor task

    // Get gRPC server address
    let addr = env::var("BANALIZE_CORE_GRPC_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:50051".to_string())
        .parse()
        .map_err(|e| anyhow::anyhow!("Invalid gRPC address: {}", e))?;

    info!("Starting gRPC server on {}", addr);

    // Create and start gRPC servers
    let core_server = create_core_server(
        config_manager.clone(),
        watcher_manager.clone(),
        database.clone(),
        firewall.clone(),
    );

    let events_server = create_events_server(event_receiver.clone());

    // Setup graceful shutdown handler
    let firewall_clone = firewall.clone();
    let watcher_manager_clone = watcher_manager.clone();
    let config_manager_clone = config_manager.clone();
    
    // Run server with graceful shutdown
    let server_result = Server::builder()
        .add_service(core_server)
        .add_service(events_server)
        .serve_with_shutdown(addr, async {
            // Wait for shutdown signal (SIGINT or SIGTERM)
            // Docker sends SIGTERM on stop, Ctrl+C sends SIGINT
            #[cfg(unix)]
            {
                let mut sigterm = unix_signal(SignalKind::terminate())
                    .expect("Failed to register SIGTERM handler");
                let mut sigint = unix_signal(SignalKind::interrupt())
                    .expect("Failed to register SIGINT handler");
                
                tokio::select! {
                    _ = sigterm.recv() => {
                        info!("Received SIGTERM, cleaning up...");
                    }
                    _ = sigint.recv() => {
                        info!("Received SIGINT, cleaning up...");
                    }
                }
            }
            #[cfg(not(unix))]
            {
                let _ = signal::ctrl_c().await;
                info!("Received shutdown signal, cleaning up...");
            }
            
            // Stop all watchers
            let configs = config_manager_clone.list_configs();
            for config in configs {
                watcher_manager_clone.stop_watcher(&config.id).await;
            }
            
            // Cleanup firewall
            if let Ok(fw) = firewall_clone.lock() {
                if let Err(e) = fw.cleanup() {
                    error!("Failed to cleanup firewall: {}", e);
                }
            }
            
            info!("Cleanup complete, shutting down...");
        })
        .await;

    // Cleanup on exit (fallback if server exits unexpectedly)
    cleaner_handle.abort();

    server_result?;
    Ok(())
}

