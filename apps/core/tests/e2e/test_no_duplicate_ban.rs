use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_no_duplicate_iptables_rule() {
    // GIVEN a banned IP
    let proc = TestProcess::start();
    let test_ip = "10.10.0.1";
    proc.create_config(
        "cfg-dedup",
        proc.log_file.to_str().unwrap(),
        "Login failed from <IP>",
        2,
        &[],
    );
    for _ in 0..2 {
        proc.append_log_line(&format!("Login failed from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    assert!(proc.wait_for_ban(test_ip, 5000), "IP {test_ip} was not banned");

    // WHEN additional matching lines arrive after the ban is already in place
    for _ in 0..3 {
        proc.append_log_line(&format!("Login failed from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_millis(500));

    // THEN the iptables DROP rule appears exactly once (is_banned() prevents duplicates)
    let rule = drop_rule("cfg-dedup", test_ip);
    let count = proc.read_iptables_log().matches(&rule as &str).count();
    assert_eq!(
        count, 1,
        "iptables -A rule appeared {count} times; expected exactly 1 (idempotency broken)\n{}",
        proc.read_iptables_log()
    );
}
