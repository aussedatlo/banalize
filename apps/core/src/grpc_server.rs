use crate::config::Config;
use crate::config_manager::ConfigManager;
use crate::database::CoreDatabase;
use crate::event_emitter::EventReceiver;
use crate::firewall::Firewall;
use crate::watcher_manager::WatcherManager;
use std::sync::{Arc, Mutex};
use tokio_stream::wrappers::ReceiverStream;
use tonic::{Request, Response, Status};
use tracing::{error, info, warn};

// Include the generated proto code
pub mod proto {
    tonic::include_proto!("banalize");
}

use proto::{
    banalize_core_server::{BanalizeCore, BanalizeCoreServer},
    banalize_events_server::{BanalizeEvents, BanalizeEventsServer},
    AddConfigRequest, AddConfigResponse, EditConfigRequest, EditConfigResponse,
    ListConfigRequest, ListConfigResponse, PingRequest, PingResponse,
    StreamEventsRequest, UnbanRequest, UnbanResponse, ConfigStatus,
    Event, MatchEvent as ProtoMatchEvent, BanEvent as ProtoBanEvent,
    UnbanEvent as ProtoUnbanEvent,
    ListCurrentBansRequest, ListCurrentBansResponse, ListCurrentMatchesRequest,
    ListCurrentMatchesResponse, BanRecord as ProtoBanRecord, MatchRecord as ProtoMatchRecord,
};

pub struct BanalizeCoreService {
    config_manager: Arc<ConfigManager>,
    watcher_manager: Arc<WatcherManager>,
    database: Arc<CoreDatabase>,
    firewall: Arc<Mutex<Firewall>>,
}

impl BanalizeCoreService {
    pub fn new(
        config_manager: Arc<ConfigManager>,
        watcher_manager: Arc<WatcherManager>,
        database: Arc<CoreDatabase>,
        firewall: Arc<Mutex<Firewall>>,
    ) -> Self {
        Self {
            config_manager,
            watcher_manager,
            database,
            firewall,
        }
    }
}

#[tonic::async_trait]
impl BanalizeCore for BanalizeCoreService {
    async fn add_config(
        &self,
        request: Request<AddConfigRequest>,
    ) -> Result<Response<AddConfigResponse>, Status> {
        let req = request.into_inner();
        
        info!("AddConfig request: id={}, name={}", req.id, req.name);

        // Create config
        let config = match Config::new(
            req.id,
            req.name,
            req.param,
            req.regex,
            req.ban_time,
            req.find_time,
            req.max_matches,
            req.ignore_ips,
        ) {
            Ok(c) => c,
            Err(e) => {
                error!("Invalid config: {}", e);
                return Ok(Response::new(AddConfigResponse {
                    success: false,
                    error: format!("Invalid config: {}", e),
                }));
            }
        };

        // Add config to manager
        if let Err(e) = self.config_manager.add_config(config.clone()) {
            error!("Failed to add config: {}", e);
            return Ok(Response::new(AddConfigResponse {
                success: false,
                error: format!("Failed to add config: {}", e),
            }));
        }

        // Start watcher
        if let Err(e) = self.watcher_manager.start_watcher(&config.id).await {
            error!("Failed to start watcher: {}", e);
            // Remove config if watcher failed to start
            self.config_manager.remove_config(&config.id);
            return Ok(Response::new(AddConfigResponse {
                success: false,
                error: format!("Failed to start watcher: {}", e),
            }));
        }

        info!("Successfully added config: {}", config.id);
        Ok(Response::new(AddConfigResponse {
            success: true,
            error: String::new(),
        }))
    }

    async fn edit_config(
        &self,
        request: Request<EditConfigRequest>,
    ) -> Result<Response<EditConfigResponse>, Status> {
        let req = request.into_inner();
        
        info!("EditConfig request: id={}", req.id);

        // Update config
        if let Err(e) = self.config_manager.update_config(
            &req.id,
            req.name,
            req.param,
            req.regex,
            req.ban_time,
            req.find_time,
            req.max_matches,
            if req.ignore_ips.is_empty() {
                None
            } else {
                Some(req.ignore_ips)
            },
        ) {
            error!("Failed to update config: {}", e);
            return Ok(Response::new(EditConfigResponse {
                success: false,
                error: format!("Failed to update config: {}", e),
            }));
        }

        // Restart watcher to apply changes
        if let Err(e) = self.watcher_manager.restart_watcher(&req.id).await {
            error!("Failed to restart watcher: {}", e);
            return Ok(Response::new(EditConfigResponse {
                success: false,
                error: format!("Failed to restart watcher: {}", e),
            }));
        }

        info!("Successfully updated config: {}", req.id);
        Ok(Response::new(EditConfigResponse {
            success: true,
            error: String::new(),
        }))
    }

    async fn unban(
        &self,
        request: Request<UnbanRequest>,
    ) -> Result<Response<UnbanResponse>, Status> {
        let req = request.into_inner();
        
        info!("Unban request: event_id={}, ip={}", req.event_id, req.ip);

        // Get all bans for this IP
        let bans = match self.database.get_all_bans() {
            Ok(b) => b,
            Err(e) => {
                error!("Failed to get bans: {}", e);
                return Ok(Response::new(UnbanResponse {
                    success: false,
                    error: format!("Failed to get bans: {}", e),
                }));
            }
        };

        // Find and remove the ban
        let mut found = false;
        for ban in bans {
            if ban.ip == req.ip {
                if let Err(e) = self.database.remove_ban(&ban.ip, ban.timestamp) {
                    error!("Failed to remove ban: {}", e);
                    return Ok(Response::new(UnbanResponse {
                        success: false,
                        error: format!("Failed to remove ban: {}", e),
                    }));
                }
                found = true;
                break;
            }
        }

        if !found {
            return Ok(Response::new(UnbanResponse {
                success: false,
                error: "Ban not found".to_string(),
            }));
        }

        // Remove from firewall
        if let Ok(mut fw) = self.firewall.lock() {
            if let Err(e) = fw.allow_ip_sync(&req.ip) {
                error!("Failed to unban IP in firewall: {}", e);
                // Don't fail the request if firewall fails (per spec)
            }
        }

        info!("Successfully unbanned IP: {}", req.ip);
        Ok(Response::new(UnbanResponse {
            success: true,
            error: String::new(),
        }))
    }

    async fn ping(
        &self,
        _request: Request<PingRequest>,
    ) -> Result<Response<PingResponse>, Status> {
        Ok(Response::new(PingResponse {
            message: "pong".to_string(),
        }))
    }

    async fn list_config(
        &self,
        _request: Request<ListConfigRequest>,
    ) -> Result<Response<ListConfigResponse>, Status> {
        let configs = self.config_manager.list_configs();
        let watcher_statuses = self.watcher_manager.get_watcher_statuses();

        let config_statuses: Vec<ConfigStatus> = configs
            .iter()
            .map(|config| {
                let running = watcher_statuses.get(&config.id).copied().unwrap_or(false);
                ConfigStatus {
                    id: config.id.clone(),
                    name: config.name.clone(),
                    param: config.param.clone(),
                    regex: config.regex.clone(),
                    ban_time: config.ban_time,
                    find_time: config.find_time,
                    max_matches: config.max_matches,
                    ignore_ips: config.ignore_ips.clone(),
                    running,
                    error: String::new(), // Could be enhanced to track errors
                }
            })
            .collect();

        Ok(Response::new(ListConfigResponse {
            configs: config_statuses,
        }))
    }

    async fn list_current_bans(
        &self,
        _request: Request<ListCurrentBansRequest>,
    ) -> Result<Response<ListCurrentBansResponse>, Status> {
        info!("ListCurrentBans request received");

        let bans = match self.database.get_all_bans() {
            Ok(b) => b,
            Err(e) => {
                error!("Failed to get bans: {}", e);
                return Err(Status::internal(format!("Failed to get bans: {}", e)));
            }
        };

        let proto_bans: Vec<ProtoBanRecord> = bans
            .into_iter()
            .map(|ban| ProtoBanRecord {
                ip: ban.ip,
                timestamp: ban.timestamp,
            })
            .collect();

        Ok(Response::new(ListCurrentBansResponse {
            bans: proto_bans,
        }))
    }

    async fn list_current_matches(
        &self,
        _request: Request<ListCurrentMatchesRequest>,
    ) -> Result<Response<ListCurrentMatchesResponse>, Status> {
        info!("ListCurrentMatches request received");

        let matches = match self.database.get_all_matches() {
            Ok(m) => m,
            Err(e) => {
                error!("Failed to get matches: {}", e);
                return Err(Status::internal(format!("Failed to get matches: {}", e)));
            }
        };

        let proto_matches: Vec<ProtoMatchRecord> = matches
            .into_iter()
            .map(|m| ProtoMatchRecord {
                config_id: m.config_id,
                ip: m.ip,
                timestamp: m.timestamp,
            })
            .collect();

        Ok(Response::new(ListCurrentMatchesResponse {
            matches: proto_matches,
        }))
    }
}

pub struct BanalizeEventsService {
    event_receiver: Arc<Mutex<EventReceiver>>,
}

impl BanalizeEventsService {
    pub fn new(event_receiver: Arc<Mutex<EventReceiver>>) -> Self {
        Self { event_receiver }
    }
}

#[tonic::async_trait]
impl BanalizeEvents for BanalizeEventsService {
    type StreamEventsStream = ReceiverStream<Result<Event, Status>>;

    async fn stream_events(
        &self,
        _request: Request<StreamEventsRequest>,
    ) -> Result<Response<Self::StreamEventsStream>, Status> {
        info!("StreamEvents request received");

        let (tx, rx) = tokio::sync::mpsc::channel(128);
        let event_receiver = self.event_receiver.clone();

        // Spawn a task to forward events from the receiver to the gRPC stream
        tokio::spawn(async move {
            loop {
                let event_opt = tokio::task::spawn_blocking({
                    let event_receiver = event_receiver.clone();
                    move || {
                        let receiver = event_receiver.lock().unwrap();
                        let match_rx = receiver.get_match_receiver();
                        let ban_rx = receiver.get_ban_receiver();
                        let unban_rx = receiver.get_unban_receiver();

                        // Try non-blocking receive from each channel
                        if let Ok(event) = match_rx.try_recv() {
                            return Some(Event {
                                event_type: Some(proto::event::EventType::Match(ProtoMatchEvent {
                                    event_id: event.event_id,
                                    line: event.line,
                                    regex: event.regex,
                                    ip: event.ip,
                                    timestamp: event.timestamp,
                                    config_id: event.config_id,
                                })),
                            });
                        }
                        if let Ok(event) = ban_rx.try_recv() {
                            return Some(Event {
                                event_type: Some(proto::event::EventType::Ban(ProtoBanEvent {
                                    event_id: event.event_id,
                                    ip: event.ip,
                                    timestamp: event.timestamp,
                                    config_id: event.config_id,
                                })),
                            });
                        }
                        if let Ok(event) = unban_rx.try_recv() {
                            return Some(Event {
                                event_type: Some(proto::event::EventType::Unban(ProtoUnbanEvent {
                                    event_id: event.event_id,
                                    ip: event.ip,
                                    timestamp: event.timestamp,
                                    config_id: event.config_id,
                                })),
                            });
                        }
                        None
                    }
                }).await;

                match event_opt {
                    Ok(Some(proto_event)) => {
                        if tx.send(Ok(proto_event)).await.is_err() {
                            warn!("Event stream receiver dropped");
                            break;
                        }
                    }
                    Ok(None) => {
                        // No events available, sleep briefly before checking again
                        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                    }
                    Err(e) => {
                        error!("Error receiving event: {}", e);
                        break;
                    }
                }
            }
        });

        Ok(Response::new(ReceiverStream::new(rx)))
    }
}

pub fn create_core_server(
    config_manager: Arc<ConfigManager>,
    watcher_manager: Arc<WatcherManager>,
    database: Arc<CoreDatabase>,
    firewall: Arc<Mutex<Firewall>>,
) -> BanalizeCoreServer<BanalizeCoreService> {
    let service = BanalizeCoreService::new(config_manager, watcher_manager, database, firewall);
    BanalizeCoreServer::new(service)
}

pub fn create_events_server(
    event_receiver: Arc<Mutex<EventReceiver>>,
) -> BanalizeEventsServer<BanalizeEventsService> {
    let service = BanalizeEventsService::new(event_receiver);
    BanalizeEventsServer::new(service)
}

