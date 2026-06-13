use crate::utils::{del_drop_rule, TestProcess};

#[test]
fn test_ban_expires() {
    // GIVEN a banned IP with a short ban_time of 2s and a 1s cleaner interval
    let proc = TestProcess::start();
    let test_ip = "10.5.0.1";
    proc.create_config_with_ban_time(
        "cfg-expiry",
        proc.log_file.to_str().unwrap(),
        "Scan detected from <IP>",
        1,
        &[],
        2000,
    );
    proc.append_log_line(&format!("Scan detected from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "IP {test_ip} was not banned");

    // WHEN the ban_time elapses and the cleaner runs
    // (no explicit action — the cleaner fires automatically every 1s)

    // THEN an Unban event is recorded and the iptables DROP rule is removed
    assert!(
        proc.wait_for_unban(test_ip, 10_000),
        "Unban event did not appear within 10s"
    );
    assert!(
        proc.wait_for_iptables_contains(&del_drop_rule("cfg-expiry", test_ip), 3000),
        "iptables -D rule not found after ban expiry:\n{}",
        proc.read_iptables_log()
    );
}
