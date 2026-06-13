use super::models::EventResponse;
use super::AppState;
use axum::{
    extract::State,
    response::sse::{Event, KeepAlive, Sse},
};
use std::convert::Infallible;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

#[utoipa::path(
    get,
    path = "/api/events/stream",
    tag = "events",
    responses(
        (status = 200, description = "SSE stream — each event is a JSON-encoded EventResponse"),
    )
)]
pub(crate) async fn stream_events(
    State(state): State<AppState>,
) -> Sse<impl futures_core::Stream<Item = Result<Event, Infallible>>> {
    let rx = state.event_emitter.subscribe();
    let stream = BroadcastStream::new(rx).filter_map(|r| r.ok()).map(|ev| {
        let dto = EventResponse::from(ev);
        Ok(Event::default().data(serde_json::to_string(&dto).unwrap_or_default()))
    });
    Sse::new(stream).keep_alive(KeepAlive::default())
}
