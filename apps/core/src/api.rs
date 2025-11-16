use crate::config::{Config, ConfigMap};
use crate::database::{SqliteDatabase, SledDatabase};
use crate::events::EventEmitter;
use crate::firewall::Firewall;
use crate::watcher_manager::WatcherManager;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigResponse {
    pub id: String,
    pub name: String,
    pub param: String,
    pub regex: String,
    pub ban_time: u64,
    pub find_time: u64,
    pub max_matches: u32,
    pub ignore_ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchResponse {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BanResponse {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnbanResponse {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Clone)]
pub struct AppState {
    pub sqlite_configs_db: Arc<tokio::sync::Mutex<SqliteDatabase>>,
    pub sqlite_events_db: Arc<tokio::sync::Mutex<SqliteDatabase>>,
    pub sled_db: Arc<SledDatabase>,
    pub configs: Arc<RwLock<ConfigMap>>,
    pub watcher_manager: Arc<WatcherManager>,
    pub event_emitter: Arc<EventEmitter>,
}

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/api/configs", get(get_configs).post(create_config))
        .route("/api/configs/{id}", get(get_config).put(update_config).delete(delete_config))
        .route("/api/matches", get(get_matches))
        .route("/api/matches/{config_id}", get(get_matches_by_config))
        .route("/api/bans", get(get_bans))
        .route("/api/bans/{config_id}", get(get_bans_by_config))
        .route("/api/bans/{id}/disable", post(disable_ban))
        .route("/api/unbans", get(get_unbans))
        .route("/api/unbans/{config_id}", get(get_unbans_by_config))
        .with_state(state)
}

// Config endpoints
async fn get_configs(State(state): State<AppState>) -> Result<Json<Vec<ConfigResponse>>, StatusCode> {
    let db = state.sqlite_configs_db.lock().await;
    let configs = db.get_all_configs().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<ConfigResponse> = configs
        .into_iter()
        .map(|c| {
            let ignore_ips: Vec<String> = serde_json::from_str(&c.ignore_ips).unwrap_or_default();
            ConfigResponse {
                id: c.id,
                name: c.name,
                param: c.param,
                regex: c.regex,
                ban_time: c.ban_time,
                find_time: c.find_time,
                max_matches: c.max_matches,
                ignore_ips,
            }
        })
        .collect();
    
    Ok(Json(responses))
}

async fn get_config(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ConfigResponse>, StatusCode> {
    let db = state.sqlite_configs_db.lock().await;
    let config = db
        .get_config(&id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    let ignore_ips: Vec<String> = serde_json::from_str(&config.ignore_ips).unwrap_or_default();
    Ok(Json(ConfigResponse {
        id: config.id,
        name: config.name,
        param: config.param,
        regex: config.regex,
        ban_time: config.ban_time,
        find_time: config.find_time,
        max_matches: config.max_matches,
        ignore_ips,
    }))
}

async fn create_config(
    State(state): State<AppState>,
    Json(payload): Json<ConfigResponse>,
) -> Result<Json<ConfigResponse>, StatusCode> {
    // Validate config
    let config = Config {
        id: payload.id.clone(),
        name: payload.name.clone(),
        param: payload.param.clone(),
        regex: payload.regex.clone(),
        ban_time: payload.ban_time,
        find_time: payload.find_time,
        max_matches: payload.max_matches,
        ignore_ips: payload.ignore_ips.clone(),
    };

    if config.validate().is_err() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Save to SQLite
    let db = state.sqlite_configs_db.lock().await;
    let ignore_ips_json = serde_json::to_string(&payload.ignore_ips).unwrap_or_default();
    let config_record = crate::database::ConfigRecord {
        id: config.id.clone(),
        name: config.name.clone(),
        param: config.param.clone(),
        regex: config.regex.clone(),
        ban_time: config.ban_time,
        find_time: config.find_time,
        max_matches: config.max_matches,
        ignore_ips: ignore_ips_json,
    };
    
    db.insert_config(&config_record)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Add to in-memory configs
    state.configs.write().await.insert(config.id.clone(), config.clone());

    // Start watcher
    if state.watcher_manager.start_watcher(config.clone()).await.is_err() {
        // Rollback: remove from SQLite and memory
        {
            let db = state.sqlite_configs_db.lock().await;
            let _ = db.delete_config(&config.id);
        }
        state.configs.write().await.remove(&config.id);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok(Json(payload))
}

async fn update_config(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<ConfigResponse>,
) -> Result<Json<ConfigResponse>, StatusCode> {
    if id != payload.id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Validate config
    let config = Config {
        id: payload.id.clone(),
        name: payload.name.clone(),
        param: payload.param.clone(),
        regex: payload.regex.clone(),
        ban_time: payload.ban_time,
        find_time: payload.find_time,
        max_matches: payload.max_matches,
        ignore_ips: payload.ignore_ips.clone(),
    };

    if config.validate().is_err() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Update SQLite
    let ignore_ips_json = serde_json::to_string(&payload.ignore_ips).unwrap_or_default();
    {
        let db = state.sqlite_configs_db.lock().await;
    let config_record = crate::database::ConfigRecord {
        id: config.id.clone(),
        name: config.name.clone(),
        param: config.param.clone(),
        regex: config.regex.clone(),
        ban_time: config.ban_time,
        find_time: config.find_time,
        max_matches: config.max_matches,
        ignore_ips: ignore_ips_json,
    };
    
        db.insert_config(&config_record)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // Update in-memory configs
    let config_clone = config.clone();
    state.configs.write().await.insert(config.id.clone(), config);

    // Restart watcher
    if state.watcher_manager.restart_watcher(config_clone).await.is_err() {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok(Json(payload))
}

async fn delete_config(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    // Stop watcher
    let _ = state.watcher_manager.stop_watcher(&id).await;

    // Remove from SQLite
    let db = state.sqlite_configs_db.lock().await;
    db.delete_config(&id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Remove from memory
    state.configs.write().await.remove(&id);

    Ok(StatusCode::NO_CONTENT)
}

// Match endpoints
async fn get_matches(State(state): State<AppState>) -> Result<Json<Vec<MatchResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_match_events(None)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<MatchResponse> = events
        .into_iter()
        .map(|e| MatchResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
        })
        .collect();
    
    Ok(Json(responses))
}

async fn get_matches_by_config(
    State(state): State<AppState>,
    Path(config_id): Path<String>,
) -> Result<Json<Vec<MatchResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_match_events(Some(&config_id))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<MatchResponse> = events
        .into_iter()
        .map(|e| MatchResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
        })
        .collect();
    
    Ok(Json(responses))
}

// Ban endpoints
async fn get_bans(State(state): State<AppState>) -> Result<Json<Vec<BanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_ban_events(None)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<BanResponse> = events
        .into_iter()
        .map(|e| BanResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
        })
        .collect();
    
    Ok(Json(responses))
}

async fn get_bans_by_config(
    State(state): State<AppState>,
    Path(config_id): Path<String>,
) -> Result<Json<Vec<BanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_ban_events(Some(&config_id))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<BanResponse> = events
        .into_iter()
        .map(|e| BanResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
        })
        .collect();
    
    Ok(Json(responses))
}

// Unban endpoints
async fn get_unbans(State(state): State<AppState>) -> Result<Json<Vec<UnbanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_unban_events(None)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<UnbanResponse> = events
        .into_iter()
        .map(|e| UnbanResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
        })
        .collect();
    
    Ok(Json(responses))
}

async fn get_unbans_by_config(
    State(state): State<AppState>,
    Path(config_id): Path<String>,
) -> Result<Json<Vec<UnbanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_unban_events(Some(&config_id))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    
    let responses: Vec<UnbanResponse> = events
        .into_iter()
        .map(|e| UnbanResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
        })
        .collect();
    
    Ok(Json(responses))
}

// Disable ban endpoint
async fn disable_ban(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<UnbanResponse>, StatusCode> {
    use std::net::IpAddr;
    use uuid::Uuid;

    // Get the ban event by ID
    let db = state.sqlite_events_db.lock().await;
    let ban_event = db
        .get_ban_event_by_id(&id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;
    
    let _ip: IpAddr = ban_event.ip.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
    let config_id = ban_event.config_id.clone();
    
    drop(db);

    // Get current timestamp
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    // Remove ban from sled database (remove all bans for this IP/config combination)
    // We need to find all ban entries and remove them
    match state.sled_db.get_bans_for_config(&config_id) {
        Ok(bans) => {
            for (ip_str, ban_timestamp) in bans {
                if ip_str == ban_event.ip {
                    let key = format!("ban:{}:{}:{}", config_id, ip_str, ban_timestamp);
                    if let Err(e) = state.sled_db.remove_ban_by_key(&key) {
                        tracing::warn!("Failed to remove ban from sled: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            tracing::warn!("Failed to get bans for config {}: {}", config_id, e);
        }
    }

    // Emit unban event using EventEmitter (handles DB insertion and firewall unban asynchronously)
    state.event_emitter
        .emit(crate::events::Event::Unban {
            config_id: config_id.clone(),
            ip: ban_event.ip.clone(),
            timestamp,
        })
        .await;

    // Generate an ID for the response (EventEmitter will generate its own ID when inserting)
    // Note: The actual event ID in DB may differ, but this is acceptable for API responses
    let unban_id = Uuid::new_v4().to_string();

    Ok(Json(UnbanResponse {
        id: unban_id,
        config_id,
        ip: ban_event.ip,
        timestamp,
    }))
}

