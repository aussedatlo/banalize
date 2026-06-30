use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ConfigResponse {
    /// Unique identifier
    pub id: String,
    /// Human-readable label
    pub name: String,
    /// Absolute path of the log file to watch
    pub param: String,
    /// Regex pattern — must contain `<IP>` as placeholder for the IPv4 address
    pub regex: String,
    /// How long a ban lasts in milliseconds
    pub ban_time: u64,
    /// Time window for counting matches in milliseconds
    pub find_time: u64,
    /// Number of matches within `find_time` that triggers a ban
    pub max_matches: u32,
    /// IPs or CIDR ranges that are never banned
    pub ignore_ips: Vec<String>,
    /// Optional escalation factor (> 1). When set, each successive ban of the
    /// same IP lasts `ban_time * recidive_multiplicator^prior_bans`. Omit or
    /// `null` to keep a flat `ban_time`.
    #[serde(default)]
    pub recidive_multiplicator: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MatchResponse {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
    pub line: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BanResponse {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UnbanResponse {
    pub id: String,
    pub config_id: String,
    pub ip: String,
    pub timestamp: u64,
}

/// One raw log line from a config's live tail stream.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TailLineResponse {
    pub line: String,
    /// Arrival time (ms epoch) — when the core read the line, not a parsed log date.
    pub timestamp: u64,
}

/// Domain event pushed over `/api/events/stream` so the UI can refresh
/// the affected views without polling.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum EventResponse {
    Match {
        config_id: String,
        ip: String,
        timestamp: u64,
        line: String,
    },
    Ban {
        config_id: String,
        ip: String,
        timestamp: u64,
    },
    Unban {
        config_id: String,
        ip: String,
        timestamp: u64,
    },
}

impl From<crate::events::Event> for EventResponse {
    fn from(event: crate::events::Event) -> Self {
        match event {
            crate::events::Event::Match {
                config_id,
                ip,
                timestamp,
                line,
            } => Self::Match {
                config_id,
                ip,
                timestamp,
                line,
            },
            crate::events::Event::Ban {
                config_id,
                ip,
                timestamp,
            } => Self::Ban {
                config_id,
                ip,
                timestamp,
            },
            crate::events::Event::Unban {
                config_id,
                ip,
                timestamp,
            } => Self::Unban {
                config_id,
                ip,
                timestamp,
            },
        }
    }
}

/// Outcome of a test notification — failure is reported in the payload, not
/// as an HTTP error.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TestResultResponse {
    pub success: bool,
    pub message: String,
}

/// Outcome of validating a config regex — an invalid pattern is reported in the
/// payload, not as an HTTP error.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct RegexValidationResponse {
    /// True when the pattern contains `<IP>` and compiles.
    pub valid: bool,
    /// Human-readable reason when invalid; `null` when valid.
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct IpStatsResponse {
    pub ip: String,
    pub match_count: u64,
    pub ban_count: u64,
    pub config_ids: Vec<String>,
    pub last_seen: u64,
}

/// Per-country attack aggregates: every offending IP folded into its GeoIP
/// country. Countries the GeoIP database can't resolve are omitted.
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CountryStatsResponse {
    /// ISO 3166-1 alpha-2 code.
    pub country_code: String,
    pub country_name: Option<String>,
    pub flag: Option<String>,
    pub match_count: u64,
    pub ban_count: u64,
    /// Distinct offending IPs geolocated to this country.
    pub ip_count: u64,
}
