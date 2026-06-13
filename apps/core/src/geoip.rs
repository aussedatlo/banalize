use maxminddb::{geoip2, Reader};
use serde::Serialize;
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use tracing::{info, warn};

const RELEASE_API: &str = "https://api.github.com/repos/P3TERX/GeoLite.mmdb/releases/latest";
const DB_ASSET: &str = "GeoLite2-Country.mmdb";
const REFRESH_INTERVAL: std::time::Duration = std::time::Duration::from_secs(24 * 60 * 60);

#[derive(Debug, Clone, Default, Serialize, utoipa::ToSchema)]
pub struct IpInfo {
    pub country_code: Option<String>,
    pub country_name: Option<String>,
    pub flag: Option<String>,
}

/// Country lookup backed by a local MaxMind database, mirroring the legacy
/// Nest backend: the mmdb is fetched from the P3TERX/GeoLite.mmdb releases on
/// startup when missing and refreshed daily. Lookups return empty info until
/// a database is available — the feature degrades, it never blocks.
pub struct GeoIp {
    reader: RwLock<Option<Reader<Vec<u8>>>>,
    db_path: PathBuf,
    auto_download: bool,
}

impl GeoIp {
    pub fn new(data_dir: &Path) -> Self {
        let auto_download = std::env::var("BANALIZE_CORE_GEOIP_AUTO_DOWNLOAD")
            .map(|v| v != "false" && v != "0")
            .unwrap_or(true);
        let geoip = Self {
            reader: RwLock::new(None),
            db_path: data_dir.join(DB_ASSET),
            auto_download,
        };
        geoip.load_from_disk();
        geoip
    }

    pub fn lookup(&self, ip: IpAddr) -> IpInfo {
        let guard = self.reader.read().unwrap();
        let Some(reader) = guard.as_ref() else {
            return IpInfo::default();
        };
        let Ok(country) = reader.lookup::<geoip2::Country>(ip) else {
            return IpInfo::default();
        };
        let Some(country) = country.country else {
            return IpInfo::default();
        };
        let iso = country.iso_code.map(str::to_string);
        IpInfo {
            flag: iso.as_deref().map(flag_emoji),
            country_name: country
                .names
                .as_ref()
                .and_then(|n| n.get("en"))
                .map(|n| n.to_string()),
            country_code: iso,
        }
    }

    fn load_from_disk(&self) {
        match Reader::open_readfile(&self.db_path) {
            Ok(reader) => {
                info!("GeoIP database loaded: {}", self.db_path.display());
                *self.reader.write().unwrap() = Some(reader);
            }
            Err(_) => {
                info!("GeoIP database not present yet: {}", self.db_path.display());
            }
        }
    }

    /// Background task: download the database when missing, then refresh it
    /// daily. Failures are logged and retried at the next tick.
    pub async fn run(self: Arc<Self>) {
        if !self.auto_download {
            info!("GeoIP auto-download disabled");
            return;
        }
        let mut interval = tokio::time::interval(REFRESH_INTERVAL);
        let mut first = true;
        loop {
            interval.tick().await;
            // The first tick fires immediately: skip it when a database is
            // already on disk. Every later tick refreshes unconditionally.
            if first && self.reader.read().unwrap().is_some() {
                first = false;
                continue;
            }
            first = false;
            if let Err(e) = self.download().await {
                warn!("GeoIP database download failed: {}", e);
            }
        }
    }

    async fn download(&self) -> Result<(), String> {
        let client = reqwest::Client::builder()
            .user_agent("banalize-core")
            .build()
            .map_err(|e| e.to_string())?;

        let release: serde_json::Value = client
            .get(RELEASE_API)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .json()
            .await
            .map_err(|e| e.to_string())?;

        let url = release["assets"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|a| a["name"].as_str() == Some(DB_ASSET))
            .and_then(|a| a["browser_download_url"].as_str())
            .ok_or_else(|| format!("{} not found in latest release", DB_ASSET))?
            .to_string();

        info!("Downloading GeoIP database from {}", url);
        let bytes = client
            .get(&url)
            .send()
            .await
            .map_err(|e| e.to_string())?
            .bytes()
            .await
            .map_err(|e| e.to_string())?;

        // Validate before swapping in: a truncated download must not clobber
        // a working database.
        let reader =
            Reader::from_source(bytes.to_vec()).map_err(|e| format!("invalid mmdb: {}", e))?;
        if let Err(e) = std::fs::write(&self.db_path, &bytes) {
            warn!("Could not persist GeoIP database: {}", e);
        }
        *self.reader.write().unwrap() = Some(reader);
        info!("GeoIP database updated ({} bytes)", bytes.len());
        Ok(())
    }
}

/// Regional-indicator flag emoji for an ISO 3166-1 alpha-2 code.
fn flag_emoji(iso: &str) -> String {
    iso.chars()
        .filter(|c| c.is_ascii_alphabetic())
        .map(|c| char::from_u32(0x1F1E6 + (c.to_ascii_uppercase() as u32 - 'A' as u32)).unwrap())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flag_emoji_from_iso_code() {
        assert_eq!(flag_emoji("FR"), "🇫🇷");
        assert_eq!(flag_emoji("us"), "🇺🇸");
    }
}
