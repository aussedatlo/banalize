use super::models::MatchResponse;
use super::AppState;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};

#[utoipa::path(
    get,
    path = "/api/matches",
    tag = "matches",
    responses(
        (status = 200, description = "All match events across all configs", body = Vec<MatchResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_matches(
    State(state): State<AppState>,
) -> Result<Json<Vec<MatchResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_match_events(None)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = events
        .into_iter()
        .map(|e| MatchResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
            line: e.line,
        })
        .collect();

    Ok(Json(responses))
}

#[utoipa::path(
    get,
    path = "/api/matches/{config_id}",
    tag = "matches",
    params(
        ("config_id" = String, Path, description = "Config ID to filter matches by"),
    ),
    responses(
        (status = 200, description = "Match events for the given config", body = Vec<MatchResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_matches_by_config(
    State(state): State<AppState>,
    Path(config_id): Path<String>,
) -> Result<Json<Vec<MatchResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let events = db
        .get_match_events(Some(&config_id))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = events
        .into_iter()
        .map(|e| MatchResponse {
            id: e.id,
            config_id: e.config_id,
            ip: e.ip,
            timestamp: e.timestamp,
            line: e.line,
        })
        .collect();

    Ok(Json(responses))
}
