use axum::response::Json;
use serde::Serialize;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub(crate) struct VersionResponse {
    /// The running core crate version (semver).
    pub version: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub(crate) struct HealthResponse {
    /// Liveness marker; always `"ok"` when the core answers.
    pub status: String,
}

#[utoipa::path(
    get,
    path = "/api/version",
    tag = "meta",
    responses(
        (status = 200, description = "Running core version", body = VersionResponse),
    )
)]
pub(crate) async fn get_version() -> Json<VersionResponse> {
    Json(VersionResponse {
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[utoipa::path(
    get,
    path = "/api/health",
    tag = "meta",
    responses(
        (status = 200, description = "Core is alive", body = HealthResponse),
    )
)]
pub(crate) async fn get_health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}
