use std::collections::VecDeque;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;
use tracing::{Event, Subscriber};
use tracing_subscriber::layer::Context;
use tracing_subscriber::Layer;

pub const LOG_BUFFER_CAPACITY: usize = 1000;

#[derive(Clone, serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct LogEntry {
    pub timestamp: u64,
    /// Severity level: ERROR, WARN, INFO, DEBUG, or TRACE
    pub level: String,
    /// The tracing target (usually the module path)
    pub target: String,
    pub message: String,
}

pub type LogBuffer = Arc<Mutex<VecDeque<LogEntry>>>;

pub struct LogCaptureLayer {
    buffer: LogBuffer,
    tx: broadcast::Sender<LogEntry>,
}

impl LogCaptureLayer {
    pub fn new(buffer: LogBuffer, tx: broadcast::Sender<LogEntry>) -> Self {
        Self { buffer, tx }
    }
}

impl<S: Subscriber> Layer<S> for LogCaptureLayer {
    fn on_event(&self, event: &Event<'_>, _ctx: Context<'_, S>) {
        let meta = event.metadata();
        let mut visitor = MessageVisitor::default();
        event.record(&mut visitor);

        let entry = LogEntry {
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
            level: meta.level().to_string().to_uppercase(),
            target: meta.target().to_string(),
            message: visitor.0,
        };

        if let Ok(mut buf) = self.buffer.lock() {
            if buf.len() >= LOG_BUFFER_CAPACITY {
                buf.pop_front();
            }
            buf.push_back(entry.clone());
        }
        let _ = self.tx.send(entry);
    }
}

#[derive(Default)]
struct MessageVisitor(String);

impl tracing::field::Visit for MessageVisitor {
    fn record_str(&mut self, field: &tracing::field::Field, value: &str) {
        if field.name() == "message" {
            self.0 = value.to_string();
        }
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if field.name() == "message" {
            self.0 = format!("{:?}", value);
        }
    }
}
