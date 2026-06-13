use std::fs::{self, OpenOptions};
use std::io::Write;
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::thread;
use std::time::{Duration, Instant};

pub const BINARY: &str = env!("CARGO_BIN_EXE_banalize-core");
pub const FAKE_IPTABLES: &str = env!("CARGO_BIN_EXE_fake-iptables");

/// Per-config iptables chain name. Deliberately duplicates
/// `src/firewall.rs::chain_name` (the crate has no lib target to import from);
/// the sanitization e2e test proves the two stay in agreement end-to-end.
pub fn chain(config_id: &str) -> String {
    const PREFIX: &str = "bnz-";
    const MAX: usize = 28;
    let sanitized: String = config_id
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.') {
                c
            } else {
                '-'
            }
        })
        .collect();
    if PREFIX.len() + sanitized.len() <= MAX && sanitized == config_id {
        return format!("{}{}", PREFIX, sanitized);
    }
    let keep = MAX - PREFIX.len() - 9;
    let prefix: String = sanitized.chars().take(keep).collect();
    let mut hash: u32 = 0x811c9dc5;
    for byte in config_id.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x0100_0193);
    }
    format!("{}{}-{:08x}", PREFIX, prefix, hash)
}

/// The exact fake-iptables log line for banning an IP under a config.
pub fn drop_rule(config_id: &str, ip: &str) -> String {
    format!("-A {} -s {} -j DROP", chain(config_id), ip)
}

/// The exact fake-iptables log line for unbanning an IP under a config.
pub fn del_drop_rule(config_id: &str, ip: &str) -> String {
    format!("-D {} -s {} -j DROP", chain(config_id), ip)
}

pub struct TestProcess {
    pub child: Child,
    pub api_port: u16,
    pub db_path: PathBuf,
    pub log_file: PathBuf,
    pub iptables_log: PathBuf,
    // Kept alive so the temp dir is not dropped while the process runs.
    // None when the DB path is externally owned (restart tests).
    _db_dir: Option<tempfile::TempDir>,
}

impl TestProcess {
    /// Start a fresh process with an isolated temp database.
    pub fn start() -> Self {
        Self::start_with_env(&[])
    }

    /// Start a fresh process with an isolated temp database and extra environment
    /// variables (e.g. `BANALIZE_FAKE_IPTABLES_FAIL` to inject firewall errors).
    pub fn start_with_env(extra_env: &[(&str, &str)]) -> Self {
        let db_dir = tempfile::tempdir().unwrap();
        let log_file = db_dir.path().join("test.log");
        let iptables_log = db_dir.path().join("iptables.log");
        let db_path = db_dir.path().to_path_buf();

        // Pre-create the log file so linemux seeks to EOF on watcher startup
        fs::write(&log_file, "").unwrap();

        let (child, port) = Self::spawn_binary(&db_path, &log_file, &iptables_log, extra_env);
        let proc = Self {
            child,
            api_port: port,
            db_path,
            log_file,
            iptables_log,
            _db_dir: Some(db_dir),
        };
        proc.wait_for_api();
        proc
    }

    /// Start a process reusing an existing database directory.
    /// Used by restart tests to verify ban restore behaviour.
    pub fn start_at(db_path: &Path, log_file: &Path, iptables_log: &Path) -> Self {
        if !log_file.exists() {
            fs::write(log_file, "").unwrap();
        }

        let (child, port) = Self::spawn_binary(db_path, log_file, iptables_log, &[]);
        let proc = Self {
            child,
            api_port: port,
            db_path: db_path.to_path_buf(),
            log_file: log_file.to_path_buf(),
            iptables_log: iptables_log.to_path_buf(),
            _db_dir: None,
        };
        proc.wait_for_api();
        proc
    }

    fn spawn_binary(
        db_path: &Path,
        _log_file: &Path,
        iptables_log: &Path,
        extra_env: &[(&str, &str)],
    ) -> (Child, u16) {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);

        let mut cmd = Command::new(BINARY);
        cmd.env("BANALIZE_CORE_API_ADDR", format!("127.0.0.1:{}", port))
            .env("BANALIZE_CORE_DATABASE_PATH", db_path.to_str().unwrap())
            .env("BANALIZE_CORE_FIREWALL_CHAIN", "INPUT")
            .env("BANALIZE_CORE_LOG_LEVEL", "WARN")
            .env("BANALIZE_CORE_CLEANER_INTERVAL", "1")
            .env("BANALIZE_IPTABLE_BIN", FAKE_IPTABLES)
            .env("BANALIZE_FAKE_IPTABLES_LOG", iptables_log.to_str().unwrap())
            // Tests must never reach out to the network for the GeoIP mmdb.
            .env("BANALIZE_CORE_GEOIP_AUTO_DOWNLOAD", "false");
        for (key, value) in extra_env {
            cmd.env(key, value);
        }

        let child = cmd.spawn().expect("Failed to spawn banalize-core");

        (child, port)
    }

    pub fn api_url(&self, path: &str) -> String {
        format!("http://127.0.0.1:{}{}", self.api_port, path)
    }

    pub fn client(&self) -> reqwest::blocking::Client {
        reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(5))
            .build()
            .unwrap()
    }

    fn wait_for_api(&self) {
        let deadline = Instant::now() + Duration::from_secs(10);
        loop {
            assert!(Instant::now() < deadline, "API did not start within 10s");
            if let Ok(r) = self.client().get(self.api_url("/api/configs")).send() {
                if r.status().is_success() {
                    return;
                }
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    /// Send SIGTERM and wait for the process to exit gracefully.
    /// This triggers `Firewall::cleanup()` inside the binary.
    pub fn stop(&mut self) {
        let pid = self.child.id();
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .status();
        let _ = self.child.wait();
    }

    pub fn append_log_line(&self, line: &str) {
        let mut f = OpenOptions::new()
            .append(true)
            .open(&self.log_file)
            .unwrap();
        writeln!(f, "{}", line).unwrap();
    }

    /// Append many lines in a single write call (burst scenario).
    pub fn append_log_lines(&self, lines: &[String]) {
        let mut f = OpenOptions::new()
            .append(true)
            .open(&self.log_file)
            .unwrap();
        let mut buf = lines.join("\n");
        buf.push('\n');
        f.write_all(buf.as_bytes()).unwrap();
    }

    /// Rotate the log: rename it aside and recreate an empty file at the
    /// original path, like logrotate's default (non-copytruncate) mode.
    /// The pause lets the tailer process the rename and re-register its
    /// pending watch before the new file's Create event fires; recreating
    /// instantly can race the watcher and lose the new file.
    pub fn rotate_log(&self) {
        let rotated = self.log_file.with_extension("log.1");
        fs::rename(&self.log_file, rotated).unwrap();
        thread::sleep(Duration::from_millis(500));
        fs::write(&self.log_file, "").unwrap();
    }

    /// Truncate the log to zero bytes in place (copytruncate-style rotation).
    pub fn truncate_log(&self) {
        fs::write(&self.log_file, "").unwrap();
    }

    pub fn read_iptables_log(&self) -> String {
        fs::read_to_string(&self.iptables_log).unwrap_or_default()
    }

    pub fn wait_for_ban(&self, ip: &str, timeout_ms: u64) -> bool {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms);
        loop {
            if Instant::now() > deadline {
                return false;
            }
            let result = self
                .client()
                .get(self.api_url("/api/bans"))
                .send()
                .and_then(|r| r.json::<Vec<serde_json::Value>>());
            if let Ok(bans) = result {
                if bans.iter().any(|b| b["ip"].as_str() == Some(ip)) {
                    return true;
                }
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    pub fn wait_for_unban(&self, ip: &str, timeout_ms: u64) -> bool {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms);
        loop {
            if Instant::now() > deadline {
                return false;
            }
            let result = self
                .client()
                .get(self.api_url("/api/unbans"))
                .send()
                .and_then(|r| r.json::<Vec<serde_json::Value>>());
            if let Ok(unbans) = result {
                if unbans.iter().any(|b| b["ip"].as_str() == Some(ip)) {
                    return true;
                }
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    pub fn wait_for_iptables_contains(&self, pattern: &str, timeout_ms: u64) -> bool {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms);
        loop {
            if Instant::now() > deadline {
                return false;
            }
            if self.read_iptables_log().contains(pattern) {
                return true;
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    /// Number of fake-iptables invocations containing `pattern`. Exact because
    /// the fake binary logs one mutating command per line (queries are not logged).
    pub fn count_iptables_occurrences(&self, pattern: &str) -> usize {
        self.read_iptables_log()
            .lines()
            .filter(|l| l.contains(pattern))
            .count()
    }

    pub fn wait_for_iptables_count(&self, pattern: &str, n: usize, timeout_ms: u64) -> bool {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms);
        loop {
            if Instant::now() > deadline {
                return false;
            }
            if self.count_iptables_occurrences(pattern) >= n {
                return true;
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    /// Wait until the audit log holds at least `min` match events for a config.
    pub fn wait_for_match_count(&self, config_id: &str, min: usize, timeout_ms: u64) -> bool {
        let deadline = Instant::now() + Duration::from_millis(timeout_ms);
        loop {
            if Instant::now() > deadline {
                return false;
            }
            if self.match_count(config_id) >= min {
                return true;
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    /// One-shot count of recorded match events for a config.
    pub fn match_count(&self, config_id: &str) -> usize {
        self.client()
            .get(self.api_url(&format!("/api/matches/{}", config_id)))
            .send()
            .and_then(|r| r.json::<Vec<serde_json::Value>>())
            .map(|m| m.len())
            .unwrap_or(0)
    }

    /// One-shot snapshot of all banned IPs, for negative assertions after a
    /// sentinel ban has proven the pipeline processed earlier lines.
    pub fn banned_ips(&self) -> Vec<String> {
        self.client()
            .get(self.api_url("/api/bans"))
            .send()
            .and_then(|r| r.json::<Vec<serde_json::Value>>())
            .map(|bans| {
                bans.iter()
                    .filter_map(|b| b["ip"].as_str().map(str::to_string))
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn create_config(
        &self,
        id: &str,
        log_file: &str,
        regex: &str,
        max_matches: u32,
        ignore_ips: &[&str],
    ) {
        self.create_config_with_ban_time(id, log_file, regex, max_matches, ignore_ips, 60000);
    }

    pub fn create_config_with_ban_time(
        &self,
        id: &str,
        log_file: &str,
        regex: &str,
        max_matches: u32,
        ignore_ips: &[&str],
        ban_time: u64,
    ) {
        self.create_config_full(id, log_file, regex, max_matches, ignore_ips, ban_time, 60000);
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_config_full(
        &self,
        id: &str,
        log_file: &str,
        regex: &str,
        max_matches: u32,
        ignore_ips: &[&str],
        ban_time: u64,
        find_time: u64,
    ) {
        let config = serde_json::json!({
            "id": id,
            "name": id,
            "param": log_file,
            "regex": regex,
            "ban_time": ban_time,
            "find_time": find_time,
            "max_matches": max_matches,
            "ignore_ips": ignore_ips,
        });
        let resp = self.post_config_raw(&config);
        assert!(
            resp.status().is_success(),
            "Failed to create config: {}",
            resp.status()
        );

        // Allow time for the watcher to register the file
        thread::sleep(Duration::from_millis(200));
    }

    /// POST a config payload without asserting success (status-code tests).
    pub fn post_config_raw(&self, body: &serde_json::Value) -> reqwest::blocking::Response {
        self.client()
            .post(self.api_url("/api/configs"))
            .json(body)
            .send()
            .unwrap()
    }

    /// PUT a config payload without asserting success (status-code tests).
    pub fn put_config_raw(&self, id: &str, body: &serde_json::Value) -> reqwest::blocking::Response {
        self.client()
            .put(self.api_url(&format!("/api/configs/{}", id)))
            .json(body)
            .send()
            .unwrap()
    }
}

impl Drop for TestProcess {
    fn drop(&mut self) {
        // SIGTERM instead of SIGKILL so the subprocess can flush its LLVM profraw
        // coverage file before exiting. kill() on an already-dead process is a no-op.
        let pid = self.child.id();
        let _ = Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .stderr(std::process::Stdio::null())
            .status();
        let _ = self.child.wait();
    }
}
