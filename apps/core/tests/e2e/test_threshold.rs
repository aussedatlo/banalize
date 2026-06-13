use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_max_matches_threshold() {
    // GIVEN a config with max_matches = 4
    let proc = TestProcess::start();
    let test_ip = "10.4.0.1";
    let max_matches = 4u32;
    proc.create_config(
        "cfg-threshold",
        proc.log_file.to_str().unwrap(),
        "Auth failure <IP>",
        max_matches,
        &[],
    );

    // WHEN N-1 matching lines are written
    for _ in 0..(max_matches - 1) {
        proc.append_log_line(&format!("Auth failure {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_secs(1));

    // THEN no ban is triggered yet
    assert!(
        !proc.wait_for_ban(test_ip, 500),
        "IP {test_ip} was banned before reaching max_matches threshold"
    );

    // WHEN the Nth matching line is written
    proc.append_log_line(&format!("Auth failure {}", test_ip));

    // THEN the ban is triggered and the iptables DROP rule is added
    assert!(
        proc.wait_for_ban(test_ip, 5000),
        "IP {test_ip} was not banned after reaching max_matches"
    );
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-threshold", test_ip), 3000),
        "iptables -A rule not found after ban:\n{}",
        proc.read_iptables_log()
    );
}
