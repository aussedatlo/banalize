use crate::utils::TestProcess;

#[test]
fn test_invalid_ignore_entry_skipped_valid_still_honored() {
    // GIVEN an ignore list mixing a garbage entry with a valid IP
    let proc = TestProcess::start();
    let ignored_ip = "10.33.0.5";
    let sentinel = "10.33.0.99";
    proc.create_config(
        "cfg-bad-ignore",
        proc.log_file.to_str().unwrap(),
        "Probe from <IP>",
        1,
        &["not-an-ip", ignored_ip],
    );

    // WHEN the ignored IP attacks, followed by a sentinel IP
    proc.append_log_line(&format!("Probe from {}", ignored_ip));
    proc.append_log_line(&format!("Probe from {}", sentinel));

    // THEN the garbage entry is skipped with a warning but the valid entry
    // still holds: the sentinel is banned, the ignored IP never matched
    assert!(proc.wait_for_ban(sentinel, 5000), "sentinel was not banned");
    assert!(
        !proc.banned_ips().contains(&ignored_ip.to_string()),
        "ignored IP must not be banned despite a garbage ignore entry"
    );
    assert_eq!(
        proc.match_count("cfg-bad-ignore"),
        1,
        "ignored IPs must not produce match events"
    );
}

#[test]
fn test_ipv6_ignore_entry_does_not_break_ipv4_banning() {
    // GIVEN an ignore list containing an IPv6 network
    let proc = TestProcess::start();
    let test_ip = "10.34.0.1";
    proc.create_config(
        "cfg-v6-ignore",
        proc.log_file.to_str().unwrap(),
        "Probe from <IP>",
        1,
        &["::1/128"],
    );

    // WHEN an IPv4 attack line arrives
    proc.append_log_line(&format!("Probe from {}", test_ip));

    // THEN IPv4 banning is unaffected by the IPv6 ignore entry
    assert!(proc.wait_for_ban(test_ip, 5000), "IPv4 IP was not banned");
}
