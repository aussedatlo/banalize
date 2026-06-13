use super::AppState;
use crate::log_capture::LogEntry;
use axum::{
    extract::State,
    response::{
        sse::{Event, KeepAlive, Sse},
        Json,
    },
};
use std::convert::Infallible;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

#[utoipa::path(
    get,
    path = "/api/logs",
    tag = "logs",
    responses(
        (status = 200, description = "Snapshot of recent log entries (up to 1000)", body = Vec<LogEntry>),
    )
)]
pub(crate) async fn get_logs(State(state): State<AppState>) -> Json<Vec<LogEntry>> {
    let buf = state.log_buffer.lock().unwrap();
    Json(buf.iter().cloned().collect())
}

#[utoipa::path(
    get,
    path = "/api/logs/stream",
    tag = "logs",
    responses(
        (status = 200, description = "SSE stream — each event is a JSON-encoded LogEntry"),
    )
)]
pub(crate) async fn stream_logs(
    State(state): State<AppState>,
) -> Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>> {
    let rx = state.log_tx.subscribe();
    let stream = BroadcastStream::new(rx)
        .filter_map(|r| r.ok())
        .map(|entry| {
            Ok(Event::default().data(serde_json::to_string(&entry).unwrap_or_default()))
        });
    Sse::new(stream).keep_alive(KeepAlive::default())
}
