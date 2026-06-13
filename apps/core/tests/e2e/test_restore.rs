use crate::utils::{chain, drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_restore_bans_on_restart() {
    // GIVEN a banned IP persisted in SQLite by a first process instance
    let test_ip = "10.6.0.1";
    let db_dir = tempfile::tempdir().unwrap();
    let log_file = db_dir.path().join("test.log");
    let iptables_log_1 = db_dir.path().join("iptables_1.log");
    let iptables_log_2 = db_dir.path().join("iptables_2.log");

    let mut proc1 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log_1);
    proc1.create_config(
        "cfg-restore",
        log_file.to_str().unwrap(),
        "Brute force from <IP>",
        1,
        &[],
    );
    proc1.append_log_line(&format!("Brute force from {}", test_ip));
    assert!(proc1.wait_for_ban(test_ip, 5000), "IP {test_ip} was not banned by process 1");

    // The ban event is already committed to SQLite by the time wait_for_ban
    // returns (the API reads it), so the record survives the restart.
    let db_path = proc1.db_path.clone();
    proc1.stop();
    thread::sleep(Duration::from_millis(300));

    // WHEN a second process starts with the same database
    let proc2 = TestProcess::start_at(&db_path, &log_file, &iptables_log_2);

    // THEN restore_state() recreates the config's chain (proc2 starts against
    // fresh firewall state) and re-applies the iptables DROP rule
    assert!(
        proc2.wait_for_iptables_contains(&drop_rule("cfg-restore", test_ip), 3000),
        "iptables -A rule not found in restore log:\n{}",
        proc2.read_iptables_log()
    );
    assert!(
        proc2.read_iptables_log().contains(&format!("-N {}", chain("cfg-restore"))),
        "config chain not recreated on restore:\n{}",
        proc2.read_iptables_log()
    );
    assert!(proc2.wait_for_ban(test_ip, 3000), "IP {test_ip} not present in process 2 ban list");
}
