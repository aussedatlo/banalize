pub mod models;
mod bans;
mod configs;
mod events;
mod ip_infos;
mod ips;
mod logs;
mod matches;
mod meta;
mod notifiers;
mod unbans;

use crate::config::ConfigMap;
use crate::database::SqliteDatabase;
use crate::events::{EventEmitter, FirewallCommand};
use crate::store::MemoryStore;
use crate::watcher_manager::WatcherManager;
use axum::{response::Html, response::Json, routing::get, routing::post, Router};
use models::{
    BanResponse, ConfigResponse, CountryStatsResponse, IpStatsResponse, MatchResponse,
    UnbanResponse,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use utoipa::OpenApi;

#[derive(Clone)]
pub struct AppState {
    pub sqlite_configs_db: Arc<tokio::sync::Mutex<SqliteDatabase>>,
    pub sqlite_events_db: Arc<tokio::sync::Mutex<SqliteDatabase>>,
    pub store: Arc<MemoryStore>,
    pub configs: Arc<RwLock<ConfigMap>>,
    pub watcher_manager: Arc<WatcherManager>,
    pub event_emitter: Arc<EventEmitter>,
    pub firewall_tx: tokio::sync::mpsc::Sender<FirewallCommand>,
    pub log_buffer: crate::log_capture::LogBuffer,
    pub log_tx: tokio::sync::broadcast::Sender<crate::log_capture::LogEntry>,
    pub geoip: Arc<crate::geoip::GeoIp>,
    pub notifiers: Arc<RwLock<Vec<crate::notifier::NotifierConfig>>>,
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "Banalize API",
        version = "0.1.0",
        description = "Log monitoring and IP ban management"
    ),
    paths(
        configs::get_configs,
        configs::get_config,
        configs::create_config,
        configs::update_config,
        configs::delete_config,
        configs::tail_config_log,
        matches::get_matches,
        matches::get_matches_by_config,
        bans::get_bans,
        bans::get_bans_by_config,
        bans::disable_ban,
        unbans::get_unbans,
        unbans::get_unbans_by_config,
        logs::get_logs,
        logs::stream_logs,
        events::stream_events,
        notifiers::get_notifiers,
        notifiers::get_notifier,
        notifiers::create_notifier,
        notifiers::update_notifier,
        notifiers::delete_notifier,
        notifiers::test_notifier,
        ip_infos::get_ip_infos,
        ips::get_ip_stats,
        ips::get_country_stats,
        meta::get_version,
        meta::get_health,
    ),
    components(schemas(
        ConfigResponse,
        MatchResponse,
        BanResponse,
        UnbanResponse,
        IpStatsResponse,
        CountryStatsResponse,
        models::TailLineResponse,
        models::EventResponse,
        models::TestResultResponse,
        crate::notifier::NotifierConfig,
        crate::notifier::EmailConfig,
        crate::notifier::SignalConfig,
        crate::notifier::NotifyEventType,
        crate::log_capture::LogEntry,
        crate::geoip::IpInfo,
        meta::VersionResponse,
        meta::HealthResponse,
    )),
    tags(
        (name = "configs", description = "Configuration management"),
        (name = "matches", description = "Match events"),
        (name = "bans",    description = "Ban management"),
        (name = "unbans",  description = "Unban events"),
        (name = "logs",    description = "Core application logs"),
        (name = "events",  description = "Live domain event stream"),
        (name = "notifiers", description = "Notification channels"),
        (name = "ip-infos", description = "GeoIP country lookup"),
        (name = "ips",     description = "Per-IP aggregates"),
        (name = "meta",    description = "Service version and health"),
    )
)]
pub struct ApiDoc;

async fn swagger_ui() -> Html<&'static str> {
    Html(
        r##"<!DOCTYPE html>
<html>
  <head>
    <title>Banalize API</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: "#swagger-ui",
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        deepLinking: true
      });
    </script>
  </body>
</html>"##,
    )
}

pub fn create_router(state: AppState) -> Router {
    // Build the stateful API router first, then collapse it to Router<()> via with_state.
    // SwaggerUi is Into<Router<()>>, so it must be merged after state is resolved.
    Router::new()
        .route(
            "/api/openapi.json",
            get(|| async { Json(ApiDoc::openapi()) }),
        )
        .route(
            "/api/configs",
            get(configs::get_configs).post(configs::create_config),
        )
        .route(
            "/api/configs/{id}",
            get(configs::get_config)
                .put(configs::update_config)
                .delete(configs::delete_config),
        )
        .route("/api/configs/{id}/tail", get(configs::tail_config_log))
        .route("/api/matches", get(matches::get_matches))
        .route(
            "/api/matches/{config_id}",
            get(matches::get_matches_by_config),
        )
        .route("/api/bans", get(bans::get_bans))
        .route("/api/bans/{config_id}", get(bans::get_bans_by_config))
        .route("/api/bans/{id}/disable", post(bans::disable_ban))
        .route("/api/unbans", get(unbans::get_unbans))
        .route(
            "/api/unbans/{config_id}",
            get(unbans::get_unbans_by_config),
        )
        .route("/api/ip-infos", get(ip_infos::get_ip_infos))
        .route("/api/ips/stats", get(ips::get_ip_stats))
        .route("/api/ips/by-country", get(ips::get_country_stats))
        .route("/api/version", get(meta::get_version))
        .route("/api/health", get(meta::get_health))
        .route("/api/logs", get(logs::get_logs))
        .route("/api/logs/stream", get(logs::stream_logs))
        .route("/api/events/stream", get(events::stream_events))
        .route(
            "/api/notifiers",
            get(notifiers::get_notifiers).post(notifiers::create_notifier),
        )
        .route(
            "/api/notifiers/{id}",
            get(notifiers::get_notifier)
                .put(notifiers::update_notifier)
                .delete(notifiers::delete_notifier),
        )
        .route("/api/notifiers/{id}/test", post(notifiers::test_notifier))
        .route("/swagger", get(swagger_ui))
        .with_state(state)
}
