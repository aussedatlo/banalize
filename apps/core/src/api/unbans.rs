use super::models::UnbanResponse;
use super::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};

#[utoipa::path(
    get,
    path = "/api/unbans",
    tag = "unbans",
    responses(
        (status = 200, description = "All unban events across all configs", body = Vec<UnbanResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_unbans(
    State(state): State<AppState>,
) -> Result<Json<Vec<UnbanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_unban_events(None)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = events
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

#[utoipa::path(
    get,
    path = "/api/unbans/{config_id}",
    tag = "unbans",
    params(
        ("config_id" = String, Path, description = "Config ID to filter unbans by"),
    ),
    responses(
        (status = 200, description = "Unban events for the given config", body = Vec<UnbanResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_unbans_by_config(
    State(state): State<AppState>,
    Path(config_id): Path<String>,
) -> Result<Json<Vec<UnbanResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_unban_events(Some(&config_id))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = events
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
