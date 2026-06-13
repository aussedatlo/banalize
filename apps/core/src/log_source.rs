use linemux::MuxedLines;
use tokio::sync::{broadcast, mpsc};
use tracing::{error, info};

/// A source of log lines. Abstracts the underlying tailing mechanism so the
/// detection pipeline can be driven by files today and other sources (journald,
/// docker logs, a test mock) later without changing the detector.
pub trait LogSource: Send {
    /// Await the next line, or `None` when the source is exhausted.
    fn next_line(&mut self) -> impl std::future::Future<Output = Option<String>> + Send;
}

/// Tails a file with `linemux`, seeking to EOF so only new lines are emitted.
pub struct FileTailer {
    path: String,
    lines: MuxedLines,
}

impl FileTailer {
    pub async fn new(path: &str) -> Result<Self, String> {
        let mut lines =
            MuxedLines::new().map_err(|e| format!("Failed to create MuxedLines: {}", e))?;
        lines
            .add_file(path)
            .await
            .map_err(|e| format!("Failed to add file {}: {}", path, e))?;
        info!("Watching file: {}", path);
        Ok(Self {
            path: path.to_string(),
            lines,
        })
    }
}

impl LogSource for FileTailer {
    async fn next_line(&mut self) -> Option<String> {
        loop {
            match self.lines.next_line().await {
                Ok(Some(line)) => return Some(line.line().to_string()),
                Ok(None) => return None,
                Err(e) => {
                    // Transient read error: log and keep tailing.
                    error!("Error reading line from {}: {}", self.path, e);
                    continue;
                }
            }
        }
    }
}

/// Run a tailer task: open the file, then forward every line to the detector
/// over `line_tx` until shutdown or the detector side is gone. Every line is
/// also published on `line_bus` for live API tailing; having no subscribers
/// there is the normal case and not an error.
///
/// Opening the file happens here (not when the watcher is registered) so a
/// missing or unreadable file does not fail config creation — it just produces
/// no lines, matching the previous behaviour.
pub async fn run_tailer(
    param: String,
    config_id: String,
    line_tx: mpsc::Sender<String>,
    line_bus: broadcast::Sender<String>,
    mut shutdown_rx: broadcast::Receiver<()>,
) {
    let mut tailer = match FileTailer::new(&param).await {
        Ok(t) => t,
        Err(e) => {
            error!("Failed to start tailer for config {}: {}", config_id, e);
            return;
        }
    };

    info!("Tailer started for config {} (file: {})", config_id, param);
    loop {
        tokio::select! {
            _ = shutdown_rx.recv() => {
                info!("Tailer {} received shutdown signal", config_id);
                break;
            }
            line = tailer.next_line() => {
                match line {
                    Some(l) => {
                        let _ = line_bus.send(l.clone());
                        // Detector gone (channel closed): nothing left to do.
                        if line_tx.send(l).await.is_err() {
                            break;
                        }
                    }
                    None => break,
                }
            }
        }
    }
    info!("Tailer {} stopped", config_id);
}
