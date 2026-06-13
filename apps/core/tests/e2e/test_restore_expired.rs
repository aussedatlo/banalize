use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_restore_skips_expired_ban() {
    // GIVEN a ban that the cleaner has already expired (an unban event is recorded in SQLite)
    let test_ip = "10.12.0.1";
    let db_dir = tempfile::tempdir().unwrap();
    let log_file = db_dir.path().join("test.log");
    let iptables_log_1 = db_dir.path().join("iptables_1.log");
    let iptables_log_2 = db_dir.path().join("iptables_2.log");

    let mut proc1 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log_1);
    proc1.create_config_with_ban_time(
        "cfg-restore-exp",
        log_file.to_str().unwrap(),
        "Blocked <IP>",
        1,
        &[],
        2000,
    );
    proc1.append_log_line(&format!("Blocked {}", test_ip));
    assert!(proc1.wait_for_ban(test_ip, 5000), "IP {test_ip} was not banned by process 1");
    assert!(proc1.wait_for_unban(test_ip, 10_000), "Ban did not expire within 10s");

    // WHEN a second process starts with the same database after the ban has expired
    let db_path = proc1.db_path.clone();
    proc1.child.kill().ok();
    proc1.child.wait().ok();
    thread::sleep(Duration::from_millis(300));
    let proc2 = TestProcess::start_at(&db_path, &log_file, &iptables_log_2);
    thread::sleep(Duration::from_secs(1));

    // THEN restore_state() reconstructs no active ban from the event log and adds no DROP rule
    assert!(
        !proc2
            .read_iptables_log()
            .contains(&drop_rule("cfg-restore-exp", test_ip)),
        "Expired ban was incorrectly restored on restart:\n{}",
        proc2.read_iptables_log()
    );
}
