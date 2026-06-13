use super::AppState;
use crate::geoip::IpInfo;
use axum::{
    extract::{Query, State},
    response::Json,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::net::IpAddr;

#[derive(Deserialize, utoipa::IntoParams)]
pub(crate) struct IpInfosQuery {
    /// Comma-separated list of IP addresses.
    ips: String,
}

#[utoipa::path(
    get,
    path = "/api/ip-infos",
    tag = "ip-infos",
    params(IpInfosQuery),
    responses(
        (status = 200, description = "Country info per requested IP (empty fields when unknown)", body = HashMap<String, IpInfo>),
    )
)]
pub(crate) async fn get_ip_infos(
    State(state): State<AppState>,
    Query(query): Query<IpInfosQuery>,
) -> Json<HashMap<String, IpInfo>> {
    let infos = query
        .ips
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|ip_str| {
            let info = ip_str
                .parse::<IpAddr>()
                .map(|ip| state.geoip.lookup(ip))
                .unwrap_or_default();
            (ip_str.to_string(), info)
        })
        .collect();
    Json(infos)
}
