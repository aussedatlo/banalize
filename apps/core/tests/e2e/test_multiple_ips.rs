use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_multiple_ips_banned_independently() {
    // GIVEN a config with max_matches=2 and two distinct IPs generating interleaved log lines
    let proc = TestProcess::start();
    let ip_a = "10.8.0.1";
    let ip_b = "10.8.0.2";
    proc.create_config(
        "cfg-multiip",
        proc.log_file.to_str().unwrap(),
        "Denied <IP>",
        2,
        &[],
    );

    // WHEN both IPs each reach the match threshold independently
    for _ in 0..2 {
        proc.append_log_line(&format!("Denied {}", ip_a));
        thread::sleep(Duration::from_millis(30));
        proc.append_log_line(&format!("Denied {}", ip_b));
        thread::sleep(Duration::from_millis(30));
    }

    // THEN both IPs are banned and both receive their own iptables DROP rules
    assert!(proc.wait_for_ban(ip_a, 5000), "IP {ip_a} was not banned");
    assert!(proc.wait_for_ban(ip_b, 5000), "IP {ip_b} was not banned");
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-multiip", ip_a), 3000),
        "iptables -A rule missing for {ip_a}:\n{}",
        proc.read_iptables_log()
    );
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-multiip", ip_b), 3000),
        "iptables -A rule missing for {ip_b}:\n{}",
        proc.read_iptables_log()
    );
}
