use super::models::{BanResponse, UnbanResponse};
use super::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use uuid::Uuid;

#[utoipa::path(
    get,
    path = "/api/bans",
    tag = "bans",
    responses(
        (status = 200, description = "All ban events across all configs", body = Vec<BanResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_bans(
    State(state): State<AppState>,
) -> Result<Json<Vec<BanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_ban_events(None)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = events
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

#[utoipa::path(
    get,
    path = "/api/bans/{config_id}",
    tag = "bans",
    params(
        ("config_id" = String, Path, description = "Config ID to filter bans by"),
    ),
    responses(
        (status = 200, description = "Ban events for the given config", body = Vec<BanResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_bans_by_config(
    State(state): State<AppState>,
    Path(config_id): Path<String>,
) -> Result<Json<Vec<BanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_ban_events(Some(&config_id))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = events
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

#[utoipa::path(
    post,
    path = "/api/bans/{id}/disable",
    tag = "bans",
    params(
        ("id" = String, Path, description = "Ban event ID to disable"),
    ),
    responses(
        (status = 200, description = "Ban disabled, unban event created", body = UnbanResponse),
        (status = 400, description = "Invalid IP address in ban record"),
        (status = 404, description = "Ban event not found"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn disable_ban(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<UnbanResponse>, StatusCode> {
    use std::net::IpAddr;

    let db = state.sqlite_events_db.lock().await;
    let ban_event = db
        .get_ban_event_by_id(&id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let ip: IpAddr = ban_event.ip.parse().map_err(|_| StatusCode::BAD_REQUEST)?;
    let config_id = ban_event.config_id.clone();
    drop(db);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;

    // Drop the ban from the in-memory store so it is no longer active.
    state.store.remove_ban(&config_id, &ip);

    // Remove the firewall rule via the actor (lossless command channel).
    let _ = state
        .firewall_tx
        .send(crate::events::FirewallCommand::Allow {
            config_id: config_id.clone(),
            ip,
        })
        .await;

    state
        .event_emitter
        .emit(crate::events::Event::Unban {
            config_id: config_id.clone(),
            ip: ban_event.ip.clone(),
            timestamp,
        })
        .await;

    Ok(Json(UnbanResponse {
        id: Uuid::new_v4().to_string(),
        config_id,
        ip: ban_event.ip,
        timestamp,
    }))
}
