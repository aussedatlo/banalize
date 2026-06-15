use super::models::{CountryStatsResponse, IpStatsResponse};
use super::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::Json,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::net::IpAddr;

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

#[utoipa::path(
    get,
    path = "/api/ips/by-country",
    tag = "ips",
    params(IpStatsQuery),
    responses(
        (status = 200, description = "Per-country attack aggregates, heaviest by bans first", body = Vec<CountryStatsResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_country_stats(
    State(state): State<AppState>,
    Query(query): Query<IpStatsQuery>,
) -> Result<Json<Vec<CountryStatsResponse>>, StatusCode> {
    let db = state.sqlite_events_db.lock().await;
    let stats = db
        .get_ip_stats(query.config_id.as_deref(), query.since)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    drop(db);

    // Fold each offending IP into its GeoIP country. IPs the database can't
    // resolve to a country code are dropped — the map only shows known origins.
    let mut by_country: HashMap<String, CountryStatsResponse> = HashMap::new();
    for s in stats {
        let Ok(ip) = s.ip.parse::<IpAddr>() else {
            continue;
        };
        let info = state.geoip.lookup(ip);
        let Some(code) = info.country_code else {
            continue;
        };
        let entry = by_country
            .entry(code.clone())
            .or_insert_with(|| CountryStatsResponse {
                country_code: code,
                country_name: info.country_name,
                flag: info.flag,
                match_count: 0,
                ban_count: 0,
                ip_count: 0,
            });
        entry.match_count += s.match_count;
        entry.ban_count += s.ban_count;
        entry.ip_count += 1;
    }

    let mut result: Vec<CountryStatsResponse> = by_country.into_values().collect();
    result.sort_by(|a, b| b.ban_count.cmp(&a.ban_count));
    Ok(Json(result))
}
