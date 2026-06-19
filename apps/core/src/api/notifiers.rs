use super::models::TestResultResponse;
use super::AppState;
use crate::notifier::{self, Notification, NotifierConfig};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
};
use uuid::Uuid;

fn to_record(config: &NotifierConfig) -> crate::database::NotifierRecord {
    crate::database::NotifierRecord {
        id: config.id.clone(),
        events: serde_json::to_string(&config.events).unwrap_or_default(),
        email_config: config
            .email_config
            .as_ref()
            .and_then(|c| serde_json::to_string(c).ok()),
        signal_config: config
            .signal_config
            .as_ref()
            .and_then(|c| serde_json::to_string(c).ok()),
    }
}

// Responses include the SMTP password: parity with the legacy API and the
// edit form needs it for prefill. Self-hosted tool; never log it.

#[utoipa::path(
    get,
    path = "/api/notifiers",
    tag = "notifiers",
    responses(
        (status = 200, description = "List of all notifiers", body = Vec<NotifierConfig>),
    )
)]
pub(crate) async fn get_notifiers(State(state): State<AppState>) -> Json<Vec<NotifierConfig>> {
    Json(state.notifiers.read().await.clone())
}

#[utoipa::path(
    get,
    path = "/api/notifiers/{id}",
    tag = "notifiers",
    params(
        ("id" = String, Path, description = "Notifier ID"),
    ),
    responses(
        (status = 200, description = "Notifier details", body = NotifierConfig),
        (status = 404, description = "Notifier not found"),
    )
)]
pub(crate) async fn get_notifier(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<NotifierConfig>, StatusCode> {
    state
        .notifiers
        .read()
        .await
        .iter()
        .find(|n| n.id == id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

#[utoipa::path(
    post,
    path = "/api/notifiers",
    tag = "notifiers",
    request_body = NotifierConfig,
    responses(
        (status = 200, description = "Created notifier", body = NotifierConfig),
        (status = 400, description = "Invalid notifier — empty events or not exactly one channel config"),
        (status = 409, description = "A notifier with this id already exists"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn create_notifier(
    State(state): State<AppState>,
    Json(mut payload): Json<NotifierConfig>,
) -> Result<Json<NotifierConfig>, StatusCode> {
    if payload.id.is_empty() {
        payload.id = Uuid::new_v4().to_string();
    }
    if payload.validate().is_err() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if state.notifiers.read().await.iter().any(|n| n.id == payload.id) {
        return Err(StatusCode::CONFLICT);
    }

    {
        let db = state.sqlite_configs_db.lock().await;
        db.insert_notifier(&to_record(&payload))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    state.notifiers.write().await.push(payload.clone());

    Ok(Json(payload))
}

#[utoipa::path(
    put,
    path = "/api/notifiers/{id}",
    tag = "notifiers",
    params(
        ("id" = String, Path, description = "Notifier ID"),
    ),
    request_body = NotifierConfig,
    responses(
        (status = 200, description = "Updated notifier", body = NotifierConfig),
        (status = 400, description = "Invalid notifier or ID mismatch"),
        (status = 404, description = "Notifier not found"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn update_notifier(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<NotifierConfig>,
) -> Result<Json<NotifierConfig>, StatusCode> {
    if id != payload.id {
        return Err(StatusCode::BAD_REQUEST);
    }
    if payload.validate().is_err() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if !state.notifiers.read().await.iter().any(|n| n.id == id) {
        return Err(StatusCode::NOT_FOUND);
    }

    {
        let db = state.sqlite_configs_db.lock().await;
        db.insert_notifier(&to_record(&payload))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    {
        let mut notifiers = state.notifiers.write().await;
        if let Some(existing) = notifiers.iter_mut().find(|n| n.id == id) {
            *existing = payload.clone();
        }
    }

    Ok(Json(payload))
}

#[utoipa::path(
    delete,
    path = "/api/notifiers/{id}",
    tag = "notifiers",
    params(
        ("id" = String, Path, description = "Notifier ID"),
    ),
    responses(
        (status = 204, description = "Notifier deleted"),
        (status = 500, description = "Internal server error"),
    )
)]
pub(crate) async fn delete_notifier(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<StatusCode, StatusCode> {
    {
        let db = state.sqlite_configs_db.lock().await;
        db.delete_notifier(&id)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    state.notifiers.write().await.retain(|n| n.id != id);

    Ok(StatusCode::NO_CONTENT)
}

#[utoipa::path(
    post,
    path = "/api/notifiers/{id}/test",
    tag = "notifiers",
    params(
        ("id" = String, Path, description = "Notifier ID"),
    ),
    responses(
        (status = 200, description = "Test outcome — check the success field", body = TestResultResponse),
        (status = 404, description = "Notifier not found"),
    )
)]
pub(crate) async fn test_notifier(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<TestResultResponse>, StatusCode> {
    let config = state
        .notifiers
        .read()
        .await
        .iter()
        .find(|n| n.id == id)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;

    let notification = Notification {
        title: "Banalize test title".to_string(),
        message: "Banalize test message".to_string(),
        html: None,
        signal: "🛡 Banalize test notification".to_string(),
    };
    let result = notifier::send(&config, &notification).await;

    Ok(Json(match result {
        Ok(()) => TestResultResponse {
            success: true,
            message: "Notification sent".to_string(),
        },
        Err(e) => TestResultResponse {
            success: false,
            message: format!("Failed to send notification: {}", e),
        },
    }))
}
