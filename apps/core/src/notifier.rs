use crate::config::ConfigMap;
use crate::events::Event;
use crate::geoip::GeoIp;
use crate::store::MemoryStore;
use lettre::message::{Mailbox, MultiPart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::transport::smtp::client::{Tls, TlsParameters};
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, RwLock};
use tracing::{info, warn};
use utoipa::ToSchema;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum NotifyEventType {
    Ban,
    Unban,
    Match,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EmailConfig {
    /// SMTP server hostname
    pub server: String,
    /// SMTP port — 465 uses implicit TLS, anything else opportunistic STARTTLS
    pub port: u16,
    /// SMTP username, also used as the From address
    pub username: String,
    pub password: String,
    pub recipient_email: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SignalConfig {
    /// signal-cli REST API endpoint, e.g. http://localhost:8080/v2/send
    pub server: String,
    /// Sender phone number registered with the Signal API
    pub number: String,
    pub recipients: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct NotifierConfig {
    pub id: String,
    /// Which domain events trigger this notifier
    pub events: Vec<NotifyEventType>,
    pub email_config: Option<EmailConfig>,
    pub signal_config: Option<SignalConfig>,
}

impl NotifierConfig {
    pub fn validate(&self) -> Result<(), String> {
        if self.events.is_empty() {
            return Err("events must not be empty".to_string());
        }
        match (&self.email_config, &self.signal_config) {
            (Some(email), None) => {
                if email.server.is_empty() || email.recipient_email.is_empty() {
                    return Err("email server and recipient_email are required".to_string());
                }
                Ok(())
            }
            (None, Some(signal)) => {
                if signal.server.is_empty() || signal.number.is_empty() || signal.recipients.is_empty()
                {
                    return Err("signal server, number and recipients are required".to_string());
                }
                Ok(())
            }
            _ => Err("exactly one of email_config or signal_config must be set".to_string()),
        }
    }
}

pub struct Notification {
    pub title: String,
    pub message: String,
    pub html: Option<String>,
}

async fn send_email(cfg: &EmailConfig, n: &Notification) -> Result<(), String> {
    let from: Mailbox = cfg
        .username
        .parse()
        .map_err(|e| format!("invalid from address: {}", e))?;
    let to: Mailbox = cfg
        .recipient_email
        .parse()
        .map_err(|e| format!("invalid recipient address: {}", e))?;

    let builder = Message::builder().from(from).to(to).subject(&n.title);
    let message = match &n.html {
        Some(html) => builder
            .multipart(MultiPart::alternative_plain_html(
                n.message.clone(),
                html.clone(),
            ))
            .map_err(|e| e.to_string())?,
        None => builder.body(n.message.clone()).map_err(|e| e.to_string())?,
    };

    // Port 465 is implicit TLS; anything else negotiates STARTTLS when the
    // server offers it (nodemailer `secure: false` semantics), which also
    // lets plaintext local debug servers work.
    let mut transport = if cfg.port == 465 {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&cfg.server).map_err(|e| e.to_string())?
    } else {
        let tls = TlsParameters::new(cfg.server.clone()).map_err(|e| e.to_string())?;
        AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&cfg.server)
            .tls(Tls::Opportunistic(tls))
    };
    transport = transport
        .port(cfg.port)
        .timeout(Some(Duration::from_secs(15)));
    if !cfg.username.is_empty() && !cfg.password.is_empty() {
        transport =
            transport.credentials(Credentials::new(cfg.username.clone(), cfg.password.clone()));
    }

    // Error strings from lettre never include the credentials.
    transport
        .build()
        .send(message)
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

async fn send_signal(cfg: &SignalConfig, n: &Notification) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let body = serde_json::json!({
        "message": format!("{}\n{}", n.title, n.message),
        "number": cfg.number,
        "recipients": cfg.recipients,
    });
    let res = client
        .post(&cfg.server)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("signal API returned {}", res.status()));
    }
    Ok(())
}

pub async fn send(cfg: &NotifierConfig, n: &Notification) -> Result<(), String> {
    match (&cfg.email_config, &cfg.signal_config) {
        (Some(email), _) => send_email(email, n).await,
        (_, Some(signal)) => send_signal(signal, n).await,
        _ => Err("notifier has no channel configured".to_string()),
    }
}

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// ISO 8601 UTC from a ms-epoch timestamp (no date crate in the tree).
fn iso8601(timestamp_ms: u64) -> String {
    let secs = (timestamp_ms / 1000) as i64;
    let ms = timestamp_ms % 1000;
    let days = secs.div_euclid(86_400);
    let secs_of_day = secs.rem_euclid(86_400);
    // Howard Hinnant's civil_from_days
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        y,
        m,
        d,
        secs_of_day / 3600,
        (secs_of_day % 3600) / 60,
        secs_of_day % 60,
        ms
    )
}

struct BanContext {
    config_name: String,
    regex: Option<String>,
    country: Option<(String, String)>, // (flag, name)
    line: Option<String>,
    match_count: Option<usize>,
}

fn build_ban_text(ip: &str, timestamp: u64, ctx: &BanContext) -> String {
    let mut lines = vec![format!("[{}] New ban", ctx.config_name), format!("IP: {}", ip)];
    if let Some((flag, name)) = &ctx.country {
        lines.push(format!("Country: {} {}", flag, name));
    }
    if let Some(regex) = &ctx.regex {
        lines.push(format!("Regex: {}", regex));
    }
    if let Some(line) = &ctx.line {
        lines.push(format!("Log: {}", line));
    }
    if let Some(count) = ctx.match_count {
        lines.push(format!("Matches: {}", count));
    }
    lines.push(format!("Time: {}", iso8601(timestamp)));
    lines.join("\n")
}

fn build_ban_html(ip: &str, timestamp: u64, ctx: &BanContext) -> String {
    let row = |label: &str, value: &str| {
        format!(
            r#"
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">{}</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">{}</td>
            </tr>"#,
            label, value
        )
    };
    let country_row = ctx
        .country
        .as_ref()
        .map(|(flag, name)| row("Country", &format!("{} {}", flag, escape_html(name))))
        .unwrap_or_default();
    let regex_row = ctx
        .regex
        .as_ref()
        .map(|r| row("Regex Pattern", &format!("<code>{}</code>", escape_html(r))))
        .unwrap_or_default();
    let log_row = ctx
        .line
        .as_ref()
        .map(|l| {
            row(
                "Matched Log",
                &format!(
                    r#"<code style="word-break: break-all;">{}</code>"#,
                    escape_html(l)
                ),
            )
        })
        .unwrap_or_default();
    let match_count_row = ctx
        .match_count
        .map(|c| row("Match Count", &c.to_string()))
        .unwrap_or_default();

    format!(
        r#"
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">IP Banned</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <table style="width: 100%; border-collapse: collapse;">{}{}{}{}{}{}
            <tr>
              <td style="padding: 10px; font-weight: bold;">Timestamp</td>
              <td style="padding: 10px;">{}</td>
            </tr>
          </table>
        </div>
        <div style="padding: 10px; background: #e9ecef; text-align: center; font-size: 12px; color: #6c757d;">
          Banalize Notification
        </div>
      </div>
    "#,
        row("IP Address", &escape_html(ip)),
        country_row,
        row("Configuration", &escape_html(&ctx.config_name)),
        regex_row,
        log_row,
        match_count_row,
        iso8601(timestamp)
    )
}

/// Most recent matched line per (config_id, ip), kept so Ban notifications can
/// include the log line that triggered them (Match is emitted before Ban for
/// the same line). Bounded: cleared wholesale when it outgrows the cap.
const LINE_CACHE_CAP: usize = 1024;

/// Consumes the lossy event bus and fans each event out to every notifier
/// subscribed to its type. Sends run in spawned tasks so a slow SMTP server
/// never lags the broadcast receiver; failures are logged and dropped.
pub async fn run_dispatcher(
    mut rx: broadcast::Receiver<Event>,
    mut shutdown_rx: broadcast::Receiver<()>,
    notifiers: Arc<RwLock<Vec<NotifierConfig>>>,
    configs: Arc<RwLock<ConfigMap>>,
    store: Arc<MemoryStore>,
    geoip: Arc<GeoIp>,
) {
    let mut line_cache: HashMap<(String, String), String> = HashMap::new();

    loop {
        let event = tokio::select! {
            _ = shutdown_rx.recv() => return,
            result = rx.recv() => match result {
                Ok(event) => event,
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    warn!("Notification dispatcher lagged, dropped {} events", n);
                    continue;
                }
                Err(broadcast::error::RecvError::Closed) => return,
            },
        };

        if let Event::Match {
            config_id, ip, line, ..
        } = &event
        {
            if line_cache.len() >= LINE_CACHE_CAP {
                line_cache.clear();
            }
            line_cache.insert((config_id.clone(), ip.clone()), line.clone());
        }

        let event_type = match &event {
            Event::Match { .. } => NotifyEventType::Match,
            Event::Ban { .. } => NotifyEventType::Ban,
            Event::Unban { .. } => NotifyEventType::Unban,
        };

        let subscribed: Vec<NotifierConfig> = notifiers
            .read()
            .await
            .iter()
            .filter(|c| c.events.contains(&event_type))
            .cloned()
            .collect();
        if subscribed.is_empty() {
            continue;
        }

        let notification = match &event {
            Event::Match { config_id, ip, .. } => {
                let name = config_name(&configs, config_id).await;
                Notification {
                    title: "Banalize: Match found".to_string(),
                    message: format!("[{}] New match for IP {}", name, ip),
                    html: None,
                }
            }
            Event::Unban { config_id, ip, .. } => {
                let name = config_name(&configs, config_id).await;
                Notification {
                    title: "Banalize: IP Unbanned".to_string(),
                    message: format!("[{}] IP {} unbanned", name, ip),
                    html: None,
                }
            }
            Event::Ban {
                config_id,
                ip,
                timestamp,
            } => {
                let config = configs.read().await.get(config_id).cloned();
                let parsed_ip = ip.parse::<IpAddr>().ok();
                let country = parsed_ip.and_then(|addr| {
                    let info = geoip.lookup(addr);
                    match (info.flag, info.country_name) {
                        (Some(flag), Some(name)) => Some((flag, name)),
                        _ => None,
                    }
                });
                let match_count = match (&config, &parsed_ip) {
                    (Some(cfg), Some(addr)) => Some(store.count_matches(
                        config_id,
                        addr,
                        timestamp.saturating_sub(cfg.find_time),
                    )),
                    _ => None,
                };
                let ctx = BanContext {
                    config_name: config
                        .as_ref()
                        .map(|c| c.name.clone())
                        .unwrap_or_else(|| config_id.clone()),
                    regex: config.as_ref().map(|c| c.regex.clone()),
                    country,
                    line: line_cache.remove(&(config_id.clone(), ip.clone())),
                    match_count,
                };
                Notification {
                    title: "Banalize: IP Banned".to_string(),
                    message: build_ban_text(ip, *timestamp, &ctx),
                    html: Some(build_ban_html(ip, *timestamp, &ctx)),
                }
            }
        };

        let notification = Arc::new(notification);
        for notifier in subscribed {
            let notification = notification.clone();
            tokio::spawn(async move {
                match send(&notifier, &notification).await {
                    Ok(()) => info!("Notification sent via notifier {}", notifier.id),
                    Err(e) => warn!("Notifier {} failed: {}", notifier.id, e),
                }
            });
        }
    }
}

async fn config_name(configs: &Arc<RwLock<ConfigMap>>, config_id: &str) -> String {
    configs
        .read()
        .await
        .get(config_id)
        .map(|c| c.name.clone())
        .unwrap_or_else(|| config_id.to_string())
}
