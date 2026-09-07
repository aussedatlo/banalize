use crate::config::ConfigMap;
use crate::database::sqlite_db::BanEvent;
use crate::database::SqliteDatabase;
use crate::geoip::GeoIp;
use crate::notifier::{self, escape_html, iso8601, Notification, NotifierConfig};
use std::collections::HashMap;
use std::net::IpAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{broadcast, Mutex, RwLock};
use tracing::{debug, info, warn};

const DAY_MS: u64 = 24 * 60 * 60 * 1000;
const WEEK_MS: u64 = 7 * DAY_MS;
const TOP_IPS: usize = 5;

/// Weekly delivery schedule in UTC (Sunday = 0).
#[derive(Debug, Clone, Copy)]
pub struct DigestSchedule {
    weekday: u64,
    time_of_day_ms: u64,
}

impl DigestSchedule {
    pub fn parse(day: &str, time: &str) -> Result<Self, String> {
        let weekday = match day.to_ascii_lowercase().as_str() {
            "sunday" => 0,
            "monday" => 1,
            "tuesday" => 2,
            "wednesday" => 3,
            "thursday" => 4,
            "friday" => 5,
            "saturday" => 6,
            _ => {
                return Err(
                    "BANALIZE_CORE_DIGEST_DAY must be a weekday name (Monday–Sunday)".into(),
                )
            }
        };
        let invalid_time =
            || "BANALIZE_CORE_DIGEST_TIME must be HH:MM in UTC (00:00–23:59)".to_string();
        let bytes = time.as_bytes();
        if bytes.len() != 5
            || bytes[2] != b':'
            || !bytes[..2].iter().chain(&bytes[3..]).all(u8::is_ascii_digit)
        {
            return Err(invalid_time());
        }
        let hour: u64 = time[..2].parse().map_err(|_| invalid_time())?;
        let minute: u64 = time[3..].parse().map_err(|_| invalid_time())?;
        if hour > 23 || minute > 59 {
            return Err(invalid_time());
        }
        Ok(Self {
            weekday,
            time_of_day_ms: (hour * 60 + minute) * 60 * 1000,
        })
    }
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

impl DigestSchedule {
    /// Milliseconds until the next configured UTC slot strictly after `now`.
    fn ms_until_next_run(self, now: u64) -> u64 {
        let days = now / DAY_MS;
        let ms_of_day = now % DAY_MS;
        // 1970-01-01 was a Thursday, so epoch day 0 has weekday 4 with Sunday = 0.
        let weekday = (days + 4) % 7;
        let mut days_ahead = (self.weekday + 7 - weekday) % 7;
        if days_ahead == 0 && ms_of_day >= self.time_of_day_ms {
            days_ahead = 7;
        }
        days_ahead * DAY_MS + self.time_of_day_ms - ms_of_day
    }
}

/// The aggregates a digest reports over its window.
#[derive(Debug, PartialEq, Eq)]
pub(crate) struct DigestData {
    total: usize,
    unique_ips: usize,
    /// Heaviest offenders first, capped at `TOP_IPS`.
    top_ips: Vec<(String, usize)>,
    /// Bans per config, heaviest first, resolved to config names.
    per_config: Vec<(String, usize)>,
    period_start: u64,
    period_end: u64,
}

impl DigestData {
    fn from_bans(
        bans: &[BanEvent],
        config_names: &HashMap<String, String>,
        period_start: u64,
        period_end: u64,
    ) -> Self {
        let mut ip_counts: HashMap<&str, usize> = HashMap::new();
        let mut config_counts: HashMap<&str, usize> = HashMap::new();
        for ban in bans {
            *ip_counts.entry(ban.ip.as_str()).or_insert(0) += 1;
            *config_counts.entry(ban.config_id.as_str()).or_insert(0) += 1;
        }

        // Count first, then IP ascending, so equal counts stay deterministic.
        let mut top_ips: Vec<(String, usize)> = ip_counts
            .iter()
            .map(|(ip, count)| ((*ip).to_string(), *count))
            .collect();
        top_ips.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        let unique_ips = top_ips.len();
        top_ips.truncate(TOP_IPS);

        let mut per_config: Vec<(String, usize)> = config_counts
            .iter()
            .map(|(id, count)| {
                let name = config_names
                    .get(*id)
                    .cloned()
                    .unwrap_or_else(|| (*id).to_string());
                (name, *count)
            })
            .collect();
        per_config.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));

        Self {
            total: bans.len(),
            unique_ips,
            top_ips,
            per_config,
            period_start,
            period_end,
        }
    }
}

fn build_text(data: &DigestData, flags: &HashMap<String, String>) -> String {
    let mut lines = vec![
        "Banalize Weekly Digest".to_string(),
        format!(
            "Period: {} → {}",
            iso8601(data.period_start),
            iso8601(data.period_end)
        ),
        String::new(),
        format!("Total Bans: {}", data.total),
        format!("Unique IPs: {}", data.unique_ips),
        String::new(),
        "Top IPs:".to_string(),
    ];
    for (ip, count) in &data.top_ips {
        match flags.get(ip) {
            Some(flag) => lines.push(format!("  {} {}: {}", flag, ip, count)),
            None => lines.push(format!("  {}: {}", ip, count)),
        }
    }
    lines.push(String::new());
    lines.push("Bans by Config:".to_string());
    for (name, count) in &data.per_config {
        lines.push(format!("  {}: {}", name, count));
    }
    lines.join("\n")
}

fn build_html(data: &DigestData, flags: &HashMap<String, String>) -> String {
    let cell = |value: &str| {
        format!(
            r#"<td style="padding: 8px; border-bottom: 1px solid #dee2e6;">{}</td>"#,
            value
        )
    };

    let top_ip_rows: String = data
        .top_ips
        .iter()
        .map(|(ip, count)| {
            let label = match flags.get(ip) {
                Some(flag) => format!("{} {}", flag, escape_html(ip)),
                None => escape_html(ip),
            };
            format!("<tr>{}{}</tr>", cell(&label), cell(&count.to_string()))
        })
        .collect();

    let config_rows: String = data
        .per_config
        .iter()
        .map(|(name, count)| {
            format!(
                "<tr>{}{}</tr>",
                cell(&escape_html(name)),
                cell(&count.to_string())
            )
        })
        .collect();

    format!(
        r#"
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1971c2; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Weekly Ban Digest</h1>
        </div>
        <div style="padding: 20px; background: #f8f9fa;">
          <p style="color: #6c757d; font-size: 13px;">Period: {} → {}</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6; font-weight: bold;">Total Bans</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">{}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Unique IPs</td>
              <td style="padding: 10px;">{}</td>
            </tr>
          </table>
          <h3 style="color: #343a40;">Top Offending IPs</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #e9ecef;">
                <th style="padding: 8px; text-align: left;">IP Address</th>
                <th style="padding: 8px; text-align: left;">Bans</th>
              </tr>
            </thead>
            <tbody>{}</tbody>
          </table>
          <h3 style="color: #343a40;">Bans by Configuration</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e9ecef;">
                <th style="padding: 8px; text-align: left;">Config</th>
                <th style="padding: 8px; text-align: left;">Bans</th>
              </tr>
            </thead>
            <tbody>{}</tbody>
          </table>
        </div>
        <div style="padding: 10px; background: #e9ecef; text-align: center; font-size: 12px; color: #6c757d;">
          Banalize Weekly Digest
        </div>
      </div>
    "#,
        iso8601(data.period_start),
        iso8601(data.period_end),
        data.total,
        data.unique_ips,
        top_ip_rows,
        config_rows
    )
}

/// Aggregate the last 7 days of bans and mail the digest to every notifier in
/// weekly mode. A window with no bans sends nothing.
async fn send_digest(
    notifiers: &Arc<RwLock<Vec<NotifierConfig>>>,
    configs: &Arc<RwLock<ConfigMap>>,
    events_db: &Arc<Mutex<SqliteDatabase>>,
    geoip: &Arc<GeoIp>,
) {
    let recipients: Vec<NotifierConfig> = notifiers
        .read()
        .await
        .iter()
        .filter(|c| c.is_weekly())
        .cloned()
        .collect();
    if recipients.is_empty() {
        debug!("No weekly notifier configured — skipping digest");
        return;
    }

    let period_end = now_ms();
    let period_start = period_end.saturating_sub(WEEK_MS);

    let bans = {
        let db = events_db.lock().await;
        match db.get_ban_events_since(period_start) {
            Ok(bans) => bans,
            Err(e) => {
                warn!("Weekly digest could not read ban events: {}", e);
                return;
            }
        }
    };
    if bans.is_empty() {
        info!("No bans in the last 7 days — skipping weekly digest");
        return;
    }

    let config_names: HashMap<String, String> = configs
        .read()
        .await
        .iter()
        .map(|(id, config)| (id.clone(), config.name.clone()))
        .collect();

    let data = DigestData::from_bans(&bans, &config_names, period_start, period_end);
    let flags: HashMap<String, String> = data
        .top_ips
        .iter()
        .filter_map(|(ip, _)| {
            let addr = ip.parse::<IpAddr>().ok()?;
            Some((ip.clone(), geoip.lookup(addr).flag?))
        })
        .collect();

    let notification = Arc::new(Notification {
        title: "Banalize: Weekly Digest".to_string(),
        message: build_text(&data, &flags),
        html: Some(build_html(&data, &flags)),
    });

    for notifier_config in recipients {
        let notification = notification.clone();
        tokio::spawn(async move {
            match notifier::send(&notifier_config, &notification).await {
                Ok(()) => info!("Weekly digest sent via notifier {}", notifier_config.id),
                Err(e) => warn!(
                    "Weekly digest via notifier {} failed: {}",
                    notifier_config.id, e
                ),
            }
        });
    }
}

/// Wait for the scheduled slot, or stop promptly on shutdown.
async fn wait_until_run(shutdown_rx: &mut broadcast::Receiver<()>, delay: Duration) -> bool {
    tokio::select! {
        _ = shutdown_rx.recv() => false,
        _ = tokio::time::sleep(delay) => true,
    }
}

/// Fires the digest at the configured weekly UTC slot.
pub async fn run(
    mut shutdown_rx: broadcast::Receiver<()>,
    notifiers: Arc<RwLock<Vec<NotifierConfig>>>,
    configs: Arc<RwLock<ConfigMap>>,
    events_db: Arc<Mutex<SqliteDatabase>>,
    geoip: Arc<GeoIp>,
    schedule: DigestSchedule,
) {
    loop {
        let delay = Duration::from_millis(schedule.ms_until_next_run(now_ms()));
        debug!("Next weekly digest in {}s", delay.as_secs());

        if !wait_until_run(&mut shutdown_rx, delay).await {
            info!("Weekly digest task received shutdown signal");
            return;
        }

        send_digest(&notifiers, &configs, &events_db, &geoip).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const RUN_TIME_OF_DAY_MS: u64 = 8 * 60 * 60 * 1000;

    fn ms_until_next_run(now: u64) -> u64 {
        DigestSchedule::parse("Monday", "08:00")
            .unwrap()
            .ms_until_next_run(now)
    }

    #[test]
    fn rejects_invalid_schedules() {
        assert!(DigestSchedule::parse("Funday", "08:00").is_err());
        for time in [
            "", "24:00", "08:60", "8:00", "08:0", "08:00:00", "-1:00", "é:00",
        ] {
            assert!(DigestSchedule::parse("Monday", time).is_err(), "{time}");
        }
    }

    #[test]
    fn schedules_every_weekday_and_time_boundary() {
        for (weekday, day) in [
            "sunday",
            "MONDAY",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
        ]
        .iter()
        .enumerate()
        {
            for time in ["00:00", "13:45", "23:59"] {
                let schedule = DigestSchedule::parse(day, time).unwrap();
                for offset in (0..WEEK_MS).step_by(37 * 60 * 1000) {
                    let now = MONDAY_MIDNIGHT + offset;
                    let next = now + schedule.ms_until_next_run(now);
                    assert_eq!((next / DAY_MS + 4) % 7, weekday as u64);
                    assert_eq!(next % DAY_MS, schedule.time_of_day_ms);
                    assert!(next > now && next - now <= WEEK_MS);
                    assert_eq!(schedule.ms_until_next_run(next - 1), 1);
                    assert_eq!(schedule.ms_until_next_run(next), WEEK_MS);
                }
            }
        }
    }

    #[tokio::test(start_paused = true)]
    async fn waits_for_the_slot_using_virtual_time() {
        let (_tx, mut rx) = broadcast::channel(1);
        let delay = Duration::from_millis(ms_until_next_run(MONDAY_MIDNIGHT));
        let start = tokio::time::Instant::now();
        assert!(wait_until_run(&mut rx, delay).await);
        assert_eq!(start.elapsed(), delay);
    }

    #[tokio::test(start_paused = true)]
    async fn shutdown_interrupts_the_wait() {
        let (tx, mut rx) = broadcast::channel(1);
        let start = tokio::time::Instant::now();
        let (ready, ()) = tokio::join!(
            wait_until_run(&mut rx, Duration::from_millis(WEEK_MS)),
            async {
                tokio::time::sleep(Duration::from_secs(1)).await;
                tx.send(()).unwrap();
            }
        );
        assert!(!ready);
        assert_eq!(start.elapsed(), Duration::from_secs(1));
    }

    /// 2026-08-10T00:00:00Z — a Monday.
    const MONDAY_MIDNIGHT: u64 = 1_786_320_000_000;

    #[test]
    fn schedules_same_day_when_before_the_slot() {
        assert_eq!(ms_until_next_run(MONDAY_MIDNIGHT), RUN_TIME_OF_DAY_MS);
        assert_eq!(
            ms_until_next_run(MONDAY_MIDNIGHT + RUN_TIME_OF_DAY_MS - 1),
            1
        );
    }

    #[test]
    fn skips_to_next_week_once_the_slot_has_passed() {
        assert_eq!(
            ms_until_next_run(MONDAY_MIDNIGHT + RUN_TIME_OF_DAY_MS),
            WEEK_MS
        );
        // Tuesday 08:00 → the following Monday 08:00, six days later.
        assert_eq!(
            ms_until_next_run(MONDAY_MIDNIGHT + DAY_MS + RUN_TIME_OF_DAY_MS),
            6 * DAY_MS
        );
    }

    #[test]
    fn always_lands_on_monday_at_the_slot() {
        for offset in (0..WEEK_MS).step_by(37 * 60 * 1000) {
            let now = MONDAY_MIDNIGHT + offset;
            let next = now + ms_until_next_run(now);
            assert_eq!(next % DAY_MS, RUN_TIME_OF_DAY_MS, "not at 08:00 UTC");
            assert_eq!((next / DAY_MS + 4) % 7, 1, "not a Monday");
            assert!(next > now);
        }
    }

    fn ban(config_id: &str, ip: &str) -> BanEvent {
        BanEvent {
            id: format!("{}-{}", config_id, ip),
            config_id: config_id.to_string(),
            ip: ip.to_string(),
            timestamp: MONDAY_MIDNIGHT,
        }
    }

    #[test]
    fn aggregates_bans_by_ip_and_config() {
        let bans = vec![
            ban("c1", "1.1.1.1"),
            ban("c1", "1.1.1.1"),
            ban("c1", "2.2.2.2"),
            ban("c2", "3.3.3.3"),
        ];
        let names = HashMap::from([("c1".to_string(), "sshd".to_string())]);

        let data = DigestData::from_bans(&bans, &names, 0, WEEK_MS);

        assert_eq!(data.total, 4);
        assert_eq!(data.unique_ips, 3);
        assert_eq!(
            data.top_ips,
            vec![
                ("1.1.1.1".to_string(), 2),
                ("2.2.2.2".to_string(), 1),
                ("3.3.3.3".to_string(), 1),
            ]
        );
        // c2 has no config row left, so it falls back to its id.
        assert_eq!(
            data.per_config,
            vec![("sshd".to_string(), 3), ("c2".to_string(), 1)]
        );
    }

    #[test]
    fn caps_the_top_ip_list() {
        let bans: Vec<BanEvent> = (0..10)
            .map(|i| ban("c1", &format!("10.0.0.{}", i)))
            .collect();

        let data = DigestData::from_bans(&bans, &HashMap::new(), 0, WEEK_MS);

        assert_eq!(data.unique_ips, 10);
        assert_eq!(data.top_ips.len(), TOP_IPS);
    }

    #[test]
    fn renders_both_bodies() {
        let bans = vec![ban("c1", "1.1.1.1"), ban("c1", "1.1.1.1")];
        let names = HashMap::from([("c1".to_string(), "sshd".to_string())]);
        let data = DigestData::from_bans(&bans, &names, 0, WEEK_MS);
        let flags = HashMap::from([("1.1.1.1".to_string(), "🇦🇺".to_string())]);

        let text = build_text(&data, &flags);
        assert!(text.contains("Total Bans: 2"));
        assert!(text.contains("Unique IPs: 1"));
        assert!(text.contains("🇦🇺 1.1.1.1: 2"));
        assert!(text.contains("sshd: 2"));

        let html = build_html(&data, &flags);
        assert!(html.contains("Weekly Ban Digest"));
        assert!(html.contains("🇦🇺 1.1.1.1"));
        assert!(html.contains("sshd"));
    }
}
