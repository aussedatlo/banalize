use crate::utils::{chain, drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_orphaned_config_chains_swept_on_restart() {
    // GIVEN a first instance that banned an IP and then died abruptly
    // (SIGKILL: no Firewall::cleanup()), leaving its per-config chain and
    // DROP rule in the shared iptables state
    let test_ip = "10.55.0.1";
    let db_dir = tempfile::tempdir().unwrap();
    let log_file = db_dir.path().join("test.log");
    // Shared across both instances so they observe the same firewall state.
    let iptables_log = db_dir.path().join("iptables.log");

    let mut proc1 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log);
    proc1.create_config(
        "cfg-orphan",
        log_file.to_str().unwrap(),
        "Orphan hit from <IP>",
        1,
        &[],
    );
    proc1.append_log_line(&format!("Orphan hit from {}", test_ip));
    let cfg_chain = chain("cfg-orphan");
    let rule = drop_rule("cfg-orphan", test_ip);
    assert!(
        proc1.wait_for_iptables_contains(&rule, 5000),
        "proc1 did not ban:\n{}",
        proc1.read_iptables_log()
    );
    proc1.child.kill().ok();
    proc1.child.wait().ok();
    thread::sleep(Duration::from_millis(300));

    // WHEN a second instance starts against that state
    let proc2 = TestProcess::start_at(db_dir.path(), &log_file, &iptables_log);

    // THEN init sweeps the orphaned chain (flush + delete after the parent
    // flush unreferenced it), and restore then recreates it and re-applies
    // the still-active ban — exactly one live rule, no duplicates
    assert!(
        proc2.wait_for_iptables_count(&rule, 2, 5000),
        "restore did not re-apply the ban after the sweep:\n{}",
        proc2.read_iptables_log()
    );
    let log = proc2.read_iptables_log();
    assert!(
        log.contains(&format!("-X {}", cfg_chain)),
        "orphaned chain was not swept at init:\n{}",
        log
    );
    assert_eq!(
        log.matches(&format!("-N {}", cfg_chain)).count(),
        2,
        "chain must be created once per instance (proc1 + proc2 restore):\n{}",
        log
    );
    assert!(proc2.wait_for_ban(test_ip, 3000), "ban not visible after restart");
}
