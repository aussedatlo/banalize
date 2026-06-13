use crate::utils::{del_drop_rule, drop_rule, TestProcess};

#[test]
fn test_reban_after_expiry_uses_persisted_window() {
    // GIVEN a config with max_matches=2, a 2s ban and a long find_time, and an
    // IP banned by two matches
    let proc = TestProcess::start();
    let test_ip = "10.39.0.1";
    proc.create_config_with_ban_time(
        "cfg-reban-expiry",
        proc.log_file.to_str().unwrap(),
        "Reban hit from <IP>",
        2,
        &[],
        2000,
    );
    proc.append_log_line(&format!("Reban hit from {}", test_ip));
    proc.append_log_line(&format!("Reban hit from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "initial ban failed");
    let drop_rule = drop_rule("cfg-reban-expiry", test_ip);
    let del_rule = del_drop_rule("cfg-reban-expiry", test_ip);

    // WHEN the ban expires and a single further match arrives
    assert!(
        proc.wait_for_iptables_contains(&del_rule, 10_000),
        "ban did not expire:\n{}",
        proc.read_iptables_log()
    );
    proc.append_log_line(&format!("Reban hit from {}", test_ip));

    // THEN the IP is re-banned immediately: the match window survives the
    // unban (only bans are cleared, matches persist within find_time)
    assert!(
        proc.wait_for_iptables_count(&drop_rule, 2, 5000),
        "second -A rule not found:\n{}",
        proc.read_iptables_log()
    );
    assert_eq!(proc.count_iptables_occurrences(&drop_rule), 2);
}

#[test]
fn test_reban_after_manual_unban() {
    // GIVEN a banned IP with a long ban_time
    let proc = TestProcess::start();
    let test_ip = "10.40.0.1";
    proc.create_config(
        "cfg-reban-manual",
        proc.log_file.to_str().unwrap(),
        "Manual hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Manual hit from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "initial ban failed");
    let drop_rule = drop_rule("cfg-reban-manual", test_ip);
    let del_rule = del_drop_rule("cfg-reban-manual", test_ip);

    // WHEN the ban is manually disabled via the API and the IP offends again
    let bans: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/bans"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    let ban_id = bans
        .iter()
        .find(|b| b["ip"].as_str() == Some(test_ip))
        .and_then(|b| b["id"].as_str())
        .expect("ban event id not found")
        .to_string();
    let resp = proc
        .client()
        .post(proc.api_url(&format!("/api/bans/{}/disable", ban_id)))
        .send()
        .unwrap();
    assert!(resp.status().is_success(), "disable failed: {}", resp.status());
    assert!(
        proc.wait_for_iptables_contains(&del_rule, 5000),
        "manual unban did not remove the rule:\n{}",
        proc.read_iptables_log()
    );
    proc.append_log_line(&format!("Manual hit from {}", test_ip));

    // THEN the IP is re-banned
    assert!(
        proc.wait_for_iptables_count(&drop_rule, 2, 5000),
        "IP was not re-banned after manual unban:\n{}",
        proc.read_iptables_log()
    );
}

#[test]
fn test_match_window_is_per_ip() {
    // GIVEN a config with max_matches=3. Match windows are per (config, IP):
    // one attacker's burst must never push an innocent IP over the threshold.
    let proc = TestProcess::start();
    let ip_a = "10.41.0.1";
    let ip_b = "10.41.0.2";
    proc.create_config(
        "cfg-per-ip-window",
        proc.log_file.to_str().unwrap(),
        "Shared hit from <IP>",
        3,
        &[],
    );

    // WHEN IP-A contributes two matches and IP-B one — three matches total
    // for the config, but no single IP at the threshold
    proc.append_log_line(&format!("Shared hit from {}", ip_a));
    proc.append_log_line(&format!("Shared hit from {}", ip_a));
    proc.append_log_line(&format!("Shared hit from {}", ip_b));

    // THEN nobody is banned yet
    assert!(
        proc.wait_for_match_count("cfg-per-ip-window", 3, 5000),
        "matches were not recorded"
    );
    assert!(
        proc.banned_ips().is_empty(),
        "no IP reached its own threshold, nobody must be banned: {:?}",
        proc.banned_ips()
    );

    // AND WHEN IP-A lands its third match
    proc.append_log_line(&format!("Shared hit from {}", ip_a));

    // THEN only IP-A is banned
    assert!(proc.wait_for_ban(ip_a, 5000), "IP-A was not banned");
    assert!(
        !proc.banned_ips().contains(&ip_b.to_string()),
        "IP-B must not be banned with a single match"
    );
}
