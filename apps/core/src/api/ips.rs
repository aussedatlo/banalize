use super::models::IpStatsResponse;
use super::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;

#[derive(Deserialize, utoipa::IntoParams)]
pub(crate) struct IpStatsQuery {
    /// Restrict the aggregation to one config.
    config_id: Option<String>,
    /// Only count events at or after this timestamp (ms epoch).
    since: Option<u64>,
}

#[utoipa::path(
    get,
    path = "/api/ips/stats",
    tag = "ips",
    params(IpStatsQuery),
    responses(
        (status = 200, description = "Per-IP event aggregates, heaviest offenders first", body = Vec<IpStatsResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_ip_stats(
    State(state): State<AppState>,
    Query(query): Query<IpStatsQuery>,
) -> Result<Json<Vec<IpStatsResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let stats = db
        .get_ip_stats(query.config_id.as_deref(), query.since)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(
        stats
            .into_iter()
            .map(|s| IpStatsResponse {
                ip: s.ip,
                match_count: s.match_count,
                ban_count: s.ban_count,
                config_ids: s.config_ids,
                last_seen: s.last_seen,
            })
            .collect(),
    ))
}
