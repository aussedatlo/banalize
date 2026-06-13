use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_restart_against_existing_chain() {
    // GIVEN a first instance that set up the firewall chain and INPUT jump rule,
    // then died abruptly (SIGKILL) without running Firewall::cleanup() — so the
    // banalize chain and its jump rule remain in the shared iptables state.
    let db_dir = tempfile::tempdir().unwrap();
    let log_file = db_dir.path().join("test.log");
    // Shared across both instances so they observe the same firewall state.
    let iptables_log = db_dir.path().join("iptables.log");

    let mut proc1 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log);
    assert!(
        proc1.wait_for_iptables_contains("-I INPUT 1 -j banalize", 2000),
        "proc1 did not link chain:\n{}",
        proc1.read_iptables_log()
    );
    // Hard kill: no SIGTERM means cleanup() never runs, leaving the chain in place.
    proc1.child.kill().ok();
    proc1.child.wait().ok();
    thread::sleep(Duration::from_millis(300));

    // WHEN a second instance starts against that pre-existing chain state
    let proc2 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log);

    // THEN init is idempotent: it re-attempts chain creation (logged again, but the
    // fake rejects it as "already exists") and detects the jump rule is already
    // present, so it does not insert a duplicate link.
    let log = proc2.read_iptables_log();
    assert_eq!(
        log.matches("-N banalize").count(),
        2,
        "both instances should attempt chain creation:\n{}",
        log
    );
    assert_eq!(
        log.matches("-I INPUT 1 -j banalize").count(),
        1,
        "jump rule must be inserted once; proc2 should detect it already exists:\n{}",
        log
    );

    // AND the restarted instance is fully functional and can still ban.
    let test_ip = "10.20.0.1";
    proc2.create_config(
        "cfg-restart",
        log_file.to_str().unwrap(),
        "Intrusion from <IP>",
        1,
        &[],
    );
    proc2.append_log_line(&format!("Intrusion from {}", test_ip));
    assert!(
        proc2.wait_for_ban(test_ip, 5000),
        "proc2 failed to ban after restart"
    );
    assert!(
        proc2.wait_for_iptables_contains(&drop_rule("cfg-restart", test_ip), 3000),
        "proc2 did not add DROP rule after restart:\n{}",
        proc2.read_iptables_log()
    );
}
