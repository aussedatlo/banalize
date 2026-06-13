use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_ban_creates_iptables_rule() {
    // GIVEN a running instance with a config watching the log file
    let proc = TestProcess::start();
    let test_ip = "10.1.0.1";
    proc.create_config(
        "cfg-ban",
        proc.log_file.to_str().unwrap(),
        "Failed login from <IP>",
        3,
        &[],
    );

    // WHEN the log file receives enough matching lines to reach max_matches
    for _ in 0..3 {
        proc.append_log_line(&format!("Failed login from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }

    // THEN the IP is recorded as banned and an iptables DROP rule is added
    assert!(proc.wait_for_ban(test_ip, 5000), "IP {test_ip} was not banned");
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-ban", test_ip), 3000),
        "iptables -A rule not found in log:\n{}",
        proc.read_iptables_log()
    );
}
