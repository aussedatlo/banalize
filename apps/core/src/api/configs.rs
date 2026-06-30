use super::models::{ConfigResponse, RegexValidationResponse, TailLineResponse};
use super::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{
        sse::{Event, KeepAlive, Sse},
        Json,
    },
};
use serde::Deserialize;
use std::convert::Infallible;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

#[derive(Deserialize, utoipa::IntoParams)]
pub(crate) struct ValidateRegexQuery {
    /// The raw config regex to validate, including the `<IP>` placeholder.
    regex: String,
}

#[utoipa::path(
    get,
    path = "/api/configs/validate-regex",
    tag = "configs",
    params(ValidateRegexQuery),
    responses(
        (status = 200, description = "Whether the pattern is a usable config regex", body = RegexValidationResponse),
    )
)]
pub(crate) async fn validate_regex(
    Query(query): Query<ValidateRegexQuery>,
) -> Json<RegexValidationResponse> {
    match crate::config::validate_regex_pattern(&query.regex) {
        Ok(()) => Json(RegexValidationResponse {
            valid: true,
            error: None,
        }),
        Err(e) => Json(RegexValidationResponse {
            valid: false,
            error: Some(e),
        }),
    }
}

#[utoipa::path(
    get,
    path = "/api/configs/{id}/tail",
    tag = "configs",
    params(
        ("id" = String, Path, description = "Config ID"),
    ),
    responses(
        (status = 200, description = "SSE stream of new log lines, starting from now — each event is a JSON-encoded TailLineResponse"),
        (status = 404, description = "No running watcher for this config"),
    )
)]
pub(crate) async fn tail_config_log(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>>, StatusCode> {
    let rx = state
        .watcher_manager
        .subscribe_lines(&id)
        .await
        .ok_or(StatusCode::NOT_FOUND)?;

    let stream = BroadcastStream::new(rx).filter_map(|r| r.ok()).map(|line| {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        Ok(Event::default().data(
            serde_json::to_string(&TailLineResponse { line, timestamp }).unwrap_or_default(),
        ))
    });
    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

#[utoipa::path(
    get,
    path = "/api/configs",
    tag = "configs",
    responses(
        (status = 200, description = "List of all configurations", body = Vec<ConfigResponse>),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_configs(
    State(state): State<AppState>,
) -> Result<Json<Vec<ConfigResponse>>, StatusCode> {
    let db = state.sqlite_configs_db.lock().await;
    let configs = db
        .get_all_configs()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let responses = configs
        .into_iter()
        .map(|c| {
            let ignore_ips: Vec<String> =
                serde_json::from_str(&c.ignore_ips).unwrap_or_default();
            ConfigResponse {
                id: c.id,
                name: c.name,
                param: c.param,
                regex: c.regex,
                ban_time: c.ban_time,
                find_time: c.find_time,
                max_matches: c.max_matches,
                ignore_ips,
                recidive_multiplicator: c.recidive_multiplicator,
            }
        })
        .collect();

    Ok(Json(responses))
}

#[utoipa::path(
    get,
    path = "/api/configs/{id}",
    tag = "configs",
    params(
        ("id" = String, Path, description = "Config ID"),
    ),
    responses(
        (status = 200, description = "Config details", body = ConfigResponse),
        (status = 404, description = "Config not found"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn get_config(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<ConfigResponse>, StatusCode> {
    let db = state.sqlite_configs_db.lock().await;
    let config = db
        .get_config(&id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .ok_or(StatusCode::NOT_FOUND)?;

    let ignore_ips: Vec<String> =
        serde_json::from_str(&config.ignore_ips).unwrap_or_default();
    Ok(Json(ConfigResponse {
        id: config.id,
        name: config.name,
        param: config.param,
        regex: config.regex,
        ban_time: config.ban_time,
        find_time: config.find_time,
        max_matches: config.max_matches,
        ignore_ips,
        recidive_multiplicator: config.recidive_multiplicator,
    }))
}

#[utoipa::path(
    post,
    path = "/api/configs",
    tag = "configs",
    request_body = ConfigResponse,
    responses(
        (status = 200, description = "Created configuration", body = ConfigResponse),
        (status = 400, description = "Invalid configuration — missing <IP> in regex, non-compiling regex, empty fields, or zero values"),
        (status = 409, description = "A config with this id already exists"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn create_config(
    State(state): State<AppState>,
    Json(payload): Json<ConfigResponse>,
) -> Result<Json<ConfigResponse>, StatusCode> {
    let config = crate::config::Config {
        id: payload.id.clone(),
        name: payload.name.clone(),
        param: payload.param.clone(),
        regex: payload.regex.clone(),
        ban_time: payload.ban_time,
        find_time: payload.find_time,
        max_matches: payload.max_matches,
        ignore_ips: payload.ignore_ips.clone(),
        recidive_multiplicator: payload.recidive_multiplicator,
    };

    if config.validate().is_err() {
        return Err(StatusCode::BAD_REQUEST);
    }

    // Reject duplicates before touching the DB: INSERT OR REPLACE would
    // overwrite the existing row, and the watcher-exists rollback below would
    // then delete the original config while its watcher keeps running.
    if state.configs.read().await.contains_key(&config.id) {
        return Err(StatusCode::CONFLICT);
    }

    let db = state.sqlite_configs_db.lock().await;
    let ignore_ips_json =
        serde_json::to_string(&payload.ignore_ips).unwrap_or_default();
    let record = crate::database::ConfigRecord {
        id: config.id.clone(),
        name: config.name.clone(),
        param: config.param.clone(),
        regex: config.regex.clone(),
        ban_time: config.ban_time,
        find_time: config.find_time,
        max_matches: config.max_matches,
        ignore_ips: ignore_ips_json,
        recidive_multiplicator: config.recidive_multiplicator,
    };

    db.insert_config(&record)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    state
        .configs
        .write()
        .await
        .insert(config.id.clone(), config.clone());

    if state.watcher_manager.start_watcher(config.clone()).await.is_err() {
        {
            let db = state.sqlite_configs_db.lock().await;
            let _ = db.delete_config(&config.id);
        }
        state.configs.write().await.remove(&config.id);
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok(Json(payload))
}

#[utoipa::path(
    put,
    path = "/api/configs/{id}",
    tag = "configs",
    params(
        ("id" = String, Path, description = "Config ID"),
    ),
    request_body = ConfigResponse,
    responses(
        (status = 200, description = "Updated configuration", body = ConfigResponse),
        (status = 400, description = "Invalid configuration or ID mismatch"),
        (status = 404, description = "Config not found"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn update_config(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<ConfigResponse>,
) -> Result<Json<ConfigResponse>, StatusCode> {
    if id != payload.id {
        return Err(StatusCode::BAD_REQUEST);
    }

    // PUT updates an existing config; creation goes through POST.
    if !state.configs.read().await.contains_key(&id) {
        return Err(StatusCode::NOT_FOUND);
    }

    let config = crate::config::Config {
        id: payload.id.clone(),
        name: payload.name.clone(),
        param: payload.param.clone(),
        regex: payload.regex.clone(),
        ban_time: payload.ban_time,
        find_time: payload.find_time,
        max_matches: payload.max_matches,
        ignore_ips: payload.ignore_ips.clone(),
        recidive_multiplicator: payload.recidive_multiplicator,
    };

    if config.validate().is_err() {
        return Err(StatusCode::BAD_REQUEST);
    }

    let ignore_ips_json =
        serde_json::to_string(&payload.ignore_ips).unwrap_or_default();
    {
        let db = state.sqlite_configs_db.lock().await;
        let record = crate::database::ConfigRecord {
            id: config.id.clone(),
            name: config.name.clone(),
            param: config.param.clone(),
            regex: config.regex.clone(),
            ban_time: config.ban_time,
            find_time: config.find_time,
            max_matches: config.max_matches,
            ignore_ips: ignore_ips_json,
            recidive_multiplicator: config.recidive_multiplicator,
        };
        db.insert_config(&record)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let config_clone = config.clone();
    state
        .configs
        .write()
        .await
        .insert(config.id.clone(), config);

    if state
        .watcher_manager
        .restart_watcher(config_clone)
        .await
        .is_err()
    {
        return Err(StatusCode::INTERNAL_SERVER_ERROR);
    }

    Ok(Json(payload))
}

#[utoipa::path(
    delete,
    path = "/api/configs/{id}",
    tag = "configs",
    params(
        ("id" = String, Path, description = "Config ID"),
    ),
    responses(
        (status = 204, description = "Config deleted"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn delete_config(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    let _ = state.watcher_manager.stop_watcher(&id).await;

    let db = state.sqlite_configs_db.lock().await;
    db.delete_config(&id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    state.configs.write().await.remove(&id);
    state.store.remove_matches(&id);

    // Lift any active bans: the cleaner only visits configs that still exist,
    // so leaving these behind would leak the firewall rules until shutdown.
    // The chain removal below drops every rule at once; the loop only records
    // the unban audit events.
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64;
    for ip in state.store.take_all_bans(&id) {
        state
            .event_emitter
            .emit(crate::events::Event::Unban {
                config_id: id.clone(),
                ip: ip.to_string(),
                timestamp,
            })
            .await;
    }
    let _ = state
        .firewall_tx
        .send(crate::events::FirewallCommand::RemoveChain {
            config_id: id.clone(),
        })
        .await;

    Ok(StatusCode::NO_CONTENT)
}
