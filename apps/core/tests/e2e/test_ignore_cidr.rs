use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_ignore_cidr_range() {
    // GIVEN a config with a CIDR range in the ignore list
    let proc = TestProcess::start();
    proc.create_config(
        "cfg-cidr",
        proc.log_file.to_str().unwrap(),
        "Connection from <IP>",
        1,
        &["192.168.0.0/24"],
    );
    let inside_ip = "192.168.0.5";
    let outside_ip = "10.0.0.5";

    // WHEN a log line matches for an IP inside the ignored CIDR
    proc.append_log_line(&format!("Connection from {}", inside_ip));
    thread::sleep(Duration::from_secs(1));

    // THEN the inside IP is not banned and no DROP rule is created for it
    assert!(
        !proc.wait_for_ban(inside_ip, 500),
        "IP {inside_ip} inside ignored CIDR was incorrectly banned"
    );
    assert!(
        !proc
            .read_iptables_log()
            .contains(&drop_rule("cfg-cidr", inside_ip)),
        "iptables DROP rule created for IP inside ignored CIDR {inside_ip}"
    );

    // WHEN a log line matches for an IP outside the ignored CIDR
    proc.append_log_line(&format!("Connection from {}", outside_ip));

    // THEN the outside IP is banned normally
    assert!(
        proc.wait_for_ban(outside_ip, 5000),
        "IP {outside_ip} outside CIDR was not banned"
    );
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-cidr", outside_ip), 3000),
        "iptables -A rule not found for IP outside CIDR:\n{}",
        proc.read_iptables_log()
    );
}
