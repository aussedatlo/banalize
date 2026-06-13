use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_match_window_restored_after_restart() {
    // GIVEN two of three required matches recorded by a first process instance
    let test_ip = "10.42.0.1";
    let db_dir = tempfile::tempdir().unwrap();
    let log_file = db_dir.path().join("test.log");
    let iptables_log_1 = db_dir.path().join("iptables_1.log");
    let iptables_log_2 = db_dir.path().join("iptables_2.log");

    let mut proc1 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log_1);
    proc1.create_config(
        "cfg-window-restore",
        log_file.to_str().unwrap(),
        "Window hit from <IP>",
        3,
        &[],
    );
    proc1.append_log_line(&format!("Window hit from {}", test_ip));
    proc1.append_log_line(&format!("Window hit from {}", test_ip));
    assert!(
        proc1.wait_for_match_count("cfg-window-restore", 2, 5000),
        "matches not recorded before restart"
    );
    proc1.stop();
    thread::sleep(Duration::from_millis(300));

    // WHEN a second process starts on the same database and one more matching
    // line arrives
    let proc2 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log_2);
    proc2.append_log_line(&format!("Window hit from {}", test_ip));

    // THEN the restored window (2 matches) plus the new one reaches the
    // threshold and the IP is banned
    assert!(
        proc2.wait_for_ban(test_ip, 5000),
        "match window was not restored across restart"
    );
}

#[test]
fn test_double_restart_single_ban_no_duplicates() {
    // GIVEN an IP banned by a first process instance
    let test_ip = "10.43.0.1";
    let db_dir = tempfile::tempdir().unwrap();
    let log_file = db_dir.path().join("test.log");
    let iptables_logs: Vec<_> = (1..=3)
        .map(|i| db_dir.path().join(format!("iptables_{}.log", i)))
        .collect();

    let mut proc1 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_logs[0]);
    proc1.create_config(
        "cfg-double-restart",
        log_file.to_str().unwrap(),
        "Double hit from <IP>",
        1,
        &[],
    );
    proc1.append_log_line(&format!("Double hit from {}", test_ip));
    assert!(proc1.wait_for_ban(test_ip, 5000), "initial ban failed");
    proc1.stop();
    thread::sleep(Duration::from_millis(300));

    // WHEN the daemon is restarted twice, each instance with a fresh firewall
    // state
    let mut proc2 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_logs[1]);
    assert!(proc2.wait_for_ban(test_ip, 5000), "ban not visible after restart 1");
    proc2.stop();
    thread::sleep(Duration::from_millis(300));

    let proc3 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_logs[2]);
    assert!(proc3.wait_for_ban(test_ip, 5000), "ban not visible after restart 2");

    // THEN the final instance re-applied the rule exactly once and the audit
    // log still holds a single Ban event — restore re-applies firewall rules
    // but never re-emits Ban events
    let drop_rule = drop_rule("cfg-double-restart", test_ip);
    assert!(
        proc3.wait_for_iptables_contains(&drop_rule, 3000),
        "rule not re-applied on second restart:\n{}",
        proc3.read_iptables_log()
    );
    assert_eq!(
        proc3.count_iptables_occurrences(&drop_rule),
        1,
        "rule must be applied exactly once per instance:\n{}",
        proc3.read_iptables_log()
    );
    let bans: Vec<serde_json::Value> = proc3
        .client()
        .get(proc3.api_url("/api/bans"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    let ban_events = bans
        .iter()
        .filter(|b| b["ip"].as_str() == Some(test_ip))
        .count();
    assert_eq!(ban_events, 1, "restore must not duplicate ban events");
}
