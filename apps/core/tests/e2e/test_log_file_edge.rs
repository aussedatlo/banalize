use crate::utils::TestProcess;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::thread;
use std::time::Duration;

fn append_to(path: &std::path::Path, line: &str) {
    let mut f = OpenOptions::new().append(true).open(path).unwrap();
    writeln!(f, "{}", line).unwrap();
}

#[test]
fn test_preexisting_lines_not_replayed() {
    // GIVEN a log file that already contains matching lines before any
    // watcher exists
    let proc = TestProcess::start();
    let old_ip = "10.35.0.1";
    let sentinel = "10.35.0.2";
    let pre_log = proc.db_path.join("pre.log");
    fs::write(
        &pre_log,
        format!(
            "Old hit from {ip}\nOld hit from {ip}\nOld hit from {ip}\n",
            ip = old_ip
        ),
    )
    .unwrap();

    // WHEN a config is created on that file and a fresh line arrives
    proc.create_config(
        "cfg-no-replay",
        pre_log.to_str().unwrap(),
        "Old hit from <IP>",
        1,
        &[],
    );
    append_to(&pre_log, &format!("Old hit from {}", sentinel));

    // THEN only the fresh line counts: the tailer seeks to EOF on startup
    assert!(proc.wait_for_ban(sentinel, 5000), "sentinel was not banned");
    assert!(
        !proc.banned_ips().contains(&old_ip.to_string()),
        "pre-existing lines must not be replayed"
    );
    assert_eq!(proc.match_count("cfg-no-replay"), 1);
}

#[test]
fn test_config_for_missing_file_created_later() {
    // GIVEN a config whose log file does not exist yet (parent dir does)
    let proc = TestProcess::start();
    let test_ip = "10.36.0.1";
    let late_log = proc.db_path.join("late.log");
    proc.create_config(
        "cfg-late-file",
        late_log.to_str().unwrap(),
        "Late hit from <IP>",
        1,
        &[],
    );

    // WHEN the file appears and a matching line is appended
    fs::write(&late_log, "").unwrap();
    thread::sleep(Duration::from_millis(300));
    append_to(&late_log, &format!("Late hit from {}", test_ip));

    // THEN the pending watch promotes on the create event and the line is seen
    assert!(
        proc.wait_for_ban(test_ip, 10_000),
        "line in late-created file was not detected"
    );
}

#[test]
fn test_log_rotation_rename_and_recreate() {
    // GIVEN a config with tailing proven by a first ban
    let proc = TestProcess::start();
    let ip_a = "10.37.0.1";
    let ip_b = "10.37.0.2";
    proc.create_config(
        "cfg-rotate",
        proc.log_file.to_str().unwrap(),
        "Rot hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Rot hit from {}", ip_a));
    assert!(proc.wait_for_ban(ip_a, 5000), "pre-rotation ban failed");

    // WHEN the log is rotated (renamed aside, empty file recreated) and a new
    // line lands in the new file
    proc.rotate_log();
    thread::sleep(Duration::from_millis(500));
    proc.append_log_line(&format!("Rot hit from {}", ip_b));

    // THEN tailing resumes on the recreated file
    assert!(
        proc.wait_for_ban(ip_b, 10_000),
        "line after rotation was not detected"
    );
}

#[test]
fn test_log_truncation_then_append() {
    // GIVEN a config with tailing proven by a first ban
    let proc = TestProcess::start();
    let ip_a = "10.38.0.1";
    let ip_b = "10.38.0.2";
    proc.create_config(
        "cfg-truncate",
        proc.log_file.to_str().unwrap(),
        "Trunc hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Trunc hit from {}", ip_a));
    assert!(proc.wait_for_ban(ip_a, 5000), "pre-truncation ban failed");

    // WHEN the file is truncated in place (copytruncate-style) and a new line
    // is appended
    proc.truncate_log();
    thread::sleep(Duration::from_millis(500));
    proc.append_log_line(&format!("Trunc hit from {}", ip_b));

    // THEN the tailer detects size < position, resets to offset 0 and reads
    // the new line
    assert!(
        proc.wait_for_ban(ip_b, 10_000),
        "line after truncation was not detected"
    );
}
