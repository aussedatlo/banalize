use crate::utils::{chain, del_drop_rule, drop_rule, TestProcess};

#[test]
fn test_rules_land_in_their_configs_chain() {
    // GIVEN two configs watching the same file with distinct regexes
    let proc = TestProcess::start();
    let ip_a = "10.51.0.1";
    let ip_b = "10.51.0.2";
    proc.create_config(
        "cfg-chain-a",
        proc.log_file.to_str().unwrap(),
        "Alpha hit from <IP>",
        1,
        &[],
    );
    proc.create_config(
        "cfg-chain-b",
        proc.log_file.to_str().unwrap(),
        "Bravo hit from <IP>",
        1,
        &[],
    );

    // WHEN each config bans its own IP
    proc.append_log_line(&format!("Alpha hit from {}", ip_a));
    proc.append_log_line(&format!("Bravo hit from {}", ip_b));

    // THEN each rule lands in its config's own chain, and never in the other's
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-chain-a", ip_a), 5000),
        "rule for {} missing from cfg-chain-a's chain:\n{}",
        ip_a,
        proc.read_iptables_log()
    );
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-chain-b", ip_b), 5000),
        "rule for {} missing from cfg-chain-b's chain:\n{}",
        ip_b,
        proc.read_iptables_log()
    );
    assert_eq!(proc.count_iptables_occurrences(&drop_rule("cfg-chain-a", ip_b)), 0);
    assert_eq!(proc.count_iptables_occurrences(&drop_rule("cfg-chain-b", ip_a)), 0);
}

/// Regression test for the shared-chain unban bug: with a single chain, two
/// configs banning the same IP deduped to one rule, and the first config's
/// unban stripped the protection the second config still expected.
#[test]
fn test_unban_from_one_config_keeps_other_configs_rule() {
    // GIVEN the same IP banned independently by two configs
    let proc = TestProcess::start();
    let test_ip = "10.52.0.1";
    proc.create_config(
        "cfg-shared-ip-a",
        proc.log_file.to_str().unwrap(),
        "Alpha hit from <IP>",
        1,
        &[],
    );
    proc.create_config(
        "cfg-shared-ip-b",
        proc.log_file.to_str().unwrap(),
        "Bravo hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Alpha hit from {}", test_ip));
    proc.append_log_line(&format!("Bravo hit from {}", test_ip));
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-shared-ip-a", test_ip), 5000),
        "config A did not ban:\n{}",
        proc.read_iptables_log()
    );
    assert!(
        proc.wait_for_iptables_contains(&drop_rule("cfg-shared-ip-b", test_ip), 5000),
        "config B did not ban:\n{}",
        proc.read_iptables_log()
    );

    // WHEN config A's ban is manually disabled
    let bans: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/bans"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    let ban_id = bans
        .iter()
        .find(|b| b["config_id"].as_str() == Some("cfg-shared-ip-a"))
        .and_then(|b| b["id"].as_str())
        .expect("config A's ban event not found")
        .to_string();
    let resp = proc
        .client()
        .post(proc.api_url(&format!("/api/bans/{}/disable", ban_id)))
        .send()
        .unwrap();
    assert!(resp.status().is_success(), "disable failed: {}", resp.status());

    // THEN only config A's rule is removed; config B still blocks the IP
    assert!(
        proc.wait_for_iptables_contains(&del_drop_rule("cfg-shared-ip-a", test_ip), 5000),
        "config A's rule was not removed:\n{}",
        proc.read_iptables_log()
    );
    assert_eq!(
        proc.count_iptables_occurrences(&del_drop_rule("cfg-shared-ip-b", test_ip)),
        0,
        "config B's rule must survive config A's unban:\n{}",
        proc.read_iptables_log()
    );
    assert_eq!(proc.count_iptables_occurrences(&drop_rule("cfg-shared-ip-b", test_ip)), 1);
}

#[test]
fn test_delete_config_leaves_other_chains_untouched() {
    // GIVEN two configs, each with an active ban in its own chain
    let proc = TestProcess::start();
    let ip_a = "10.53.0.1";
    let ip_b = "10.53.0.2";
    proc.create_config(
        "cfg-del-iso-a",
        proc.log_file.to_str().unwrap(),
        "Alpha hit from <IP>",
        1,
        &[],
    );
    proc.create_config(
        "cfg-del-iso-b",
        proc.log_file.to_str().unwrap(),
        "Bravo hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Alpha hit from {}", ip_a));
    proc.append_log_line(&format!("Bravo hit from {}", ip_b));
    assert!(proc.wait_for_ban(ip_a, 5000) && proc.wait_for_ban(ip_b, 5000));

    // WHEN config A is deleted
    let resp = proc
        .client()
        .delete(proc.api_url("/api/configs/cfg-del-iso-a"))
        .send()
        .unwrap();
    assert_eq!(resp.status(), reqwest::StatusCode::NO_CONTENT);

    // THEN config A's chain is torn down while config B's chain and rule
    // remain fully intact
    let chain_a = chain("cfg-del-iso-a");
    let chain_b = chain("cfg-del-iso-b");
    assert!(
        proc.wait_for_iptables_contains(&format!("-X {}", chain_a), 5000),
        "config A's chain was not deleted:\n{}",
        proc.read_iptables_log()
    );
    let log = proc.read_iptables_log();
    assert!(!log.contains(&format!("-F {}", chain_b)), "config B's chain was flushed:\n{}", log);
    assert!(!log.contains(&format!("-X {}", chain_b)), "config B's chain was deleted:\n{}", log);
    assert_eq!(
        proc.count_iptables_occurrences(&del_drop_rule("cfg-del-iso-b", ip_b)),
        0,
        "config B's rule must not be removed:\n{}",
        log
    );
}
