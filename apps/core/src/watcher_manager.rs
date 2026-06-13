use crate::config::Config;
use crate::detector::Detector;
use crate::events::{EventEmitter, FirewallCommand};
use crate::log_source::run_tailer;
use crate::store::MemoryStore;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, RwLock};
use tokio::task::JoinHandle;
use tracing::{info, warn};

/// Buffer for the tailer -> detector line channel. Bounded so a flood applies
/// backpressure to the tailer rather than growing memory unboundedly.
const LINE_CHANNEL_CAPACITY: usize = 1024;

/// Buffer for the live-tail broadcast bus. Slow SSE subscribers that lag past
/// this many lines miss the overflow instead of blocking the tailer.
const LINE_BUS_CAPACITY: usize = 256;

/// The two tasks backing one watched config: a tailer producing lines and a
/// detector consuming them, joined by a private mpsc and a shared shutdown.
struct WatcherTasks {
    tailer: JoinHandle<()>,
    detector: JoinHandle<()>,
    shutdown_tx: broadcast::Sender<()>,
    /// Fan-out of raw tailed lines for live API subscribers.
    line_bus: broadcast::Sender<String>,
}

pub struct WatcherManager {
    store: Arc<MemoryStore>,
    event_emitter: Arc<EventEmitter>,
    firewall_tx: mpsc::Sender<FirewallCommand>,
    watchers: Arc<RwLock<HashMap<String, WatcherTasks>>>,
}

impl WatcherManager {
    pub fn new(
        store: Arc<MemoryStore>,
        event_emitter: Arc<EventEmitter>,
        firewall_tx: mpsc::Sender<FirewallCommand>,
    ) -> Self {
        Self {
            store,
            event_emitter,
            firewall_tx,
            watchers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Start a tailer + detector pair for a config.
    pub async fn start_watcher(&self, config: Config) -> Result<(), String> {
        config.validate()?;

        let config_id = config.id.clone();
        let mut watchers = self.watchers.write().await;

        if watchers.contains_key(&config_id) {
            return Err(format!("Watcher for config {} already exists", config_id));
        }

        // Detector owns the ban policy; create it up front so an invalid config
        // fails fast before any task is spawned.
        let detector = Detector::new(
            config.clone(),
            self.store.clone(),
            self.event_emitter.clone(),
            self.firewall_tx.clone(),
        )?;

        // One shutdown signal fans out to both tasks; one mpsc carries lines.
        let (shutdown_tx, _) = broadcast::channel(16);
        let (line_tx, line_rx) = mpsc::channel::<String>(LINE_CHANNEL_CAPACITY);
        let (line_bus, _) = broadcast::channel::<String>(LINE_BUS_CAPACITY);

        // Tailer task: read the file, forward lines.
        let tailer = {
            let param = config.param.clone();
            let id = config_id.clone();
            let bus = line_bus.clone();
            let shutdown_rx = shutdown_tx.subscribe();
            tokio::spawn(async move {
                run_tailer(param, id, line_tx, bus, shutdown_rx).await;
            })
        };

        // Detector task: apply policy to lines.
        let detector_handle = {
            let shutdown_rx = shutdown_tx.subscribe();
            tokio::spawn(async move {
                detector.run(line_rx, shutdown_rx).await;
            })
        };

        watchers.insert(
            config_id.clone(),
            WatcherTasks {
                tailer,
                detector: detector_handle,
                shutdown_tx,
                line_bus,
            },
        );
        info!("Started watcher for config: {}", config_id);

        Ok(())
    }

    /// Subscribe to the raw lines tailed for a config, starting from now.
    /// `None` when no watcher is running for this config.
    pub async fn subscribe_lines(
        &self,
        config_id: &str,
    ) -> Option<broadcast::Receiver<String>> {
        self.watchers
            .read()
            .await
            .get(config_id)
            .map(|tasks| tasks.line_bus.subscribe())
    }

    /// Stop the tailer + detector pair for a config.
    pub async fn stop_watcher(&self, config_id: &str) -> Result<(), String> {
        let mut watchers = self.watchers.write().await;

        if let Some(tasks) = watchers.remove(config_id) {
            stop_tasks(config_id, tasks).await;
            Ok(())
        } else {
            Err(format!("Watcher for config {} not found", config_id))
        }
    }

    /// Restart a watcher (stop and start).
    pub async fn restart_watcher(&self, config: Config) -> Result<(), String> {
        let config_id = config.id.clone();
        if self.watchers.read().await.contains_key(&config_id) {
            self.stop_watcher(&config_id).await?;
        }
        self.start_watcher(config).await
    }

    /// Stop all watchers.
    pub async fn stop_all(&self) {
        info!("Stopping all watchers");
        let mut watchers = self.watchers.write().await;
        let config_ids: Vec<String> = watchers.keys().cloned().collect();

        for config_id in config_ids {
            if let Some(tasks) = watchers.remove(&config_id) {
                stop_tasks(&config_id, tasks).await;
            }
        }
    }
}

/// Signal both tasks to stop and wait for them (aborting on timeout).
async fn stop_tasks(config_id: &str, tasks: WatcherTasks) {
    let WatcherTasks {
        tailer,
        detector,
        shutdown_tx,
        line_bus: _,
    } = tasks;

    let _ = shutdown_tx.send(());
    join_or_abort(config_id, "tailer", tailer).await;
    join_or_abort(config_id, "detector", detector).await;
    info!("Watcher {} stopped", config_id);
}

async fn join_or_abort(config_id: &str, kind: &str, mut handle: JoinHandle<()>) {
    tokio::select! {
        _ = &mut handle => {}
        _ = tokio::time::sleep(tokio::time::Duration::from_secs(5)) => {
            warn!("{} for {} did not stop within timeout, aborting", kind, config_id);
            handle.abort();
        }
    }
}
