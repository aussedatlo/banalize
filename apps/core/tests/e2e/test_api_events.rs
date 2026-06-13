use crate::utils::TestProcess;
use std::thread;
use std::time::Duration;

#[test]
fn test_bans_by_config() {
    // GIVEN a banned IP
    let proc = TestProcess::start();
    let test_ip = "10.21.0.1";
    let config_id = "cfg-bans-by-config";
    proc.create_config(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Attack from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Attack from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "IP not banned");

    // WHEN fetching bans filtered by config ID
    let bans: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url(&format!("/api/bans/{}", config_id)))
        .send()
        .unwrap()
        .json()
        .unwrap();

    // THEN the ban is present in the filtered response
    assert!(
        bans.iter().any(|b| b["ip"].as_str() == Some(test_ip)
            && b["config_id"].as_str() == Some(config_id)),
        "Ban for {test_ip} not found in /api/bans/{config_id}: {bans:?}"
    );
}

#[test]
fn test_matches_all() {
    // GIVEN a config with a high threshold so no bans fire
    let proc = TestProcess::start();
    let config_id = "cfg-matches-all";
    proc.create_config_with_ban_time(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Scan from <IP>",
        10,
        &[],
        60000,
    );

    // WHEN 3 lines with distinct IPs are written
    for i in 1..=3u8 {
        proc.append_log_line(&format!("Scan from 10.22.0.{}", i));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_millis(500)); // allow async sqlite handler to flush

    // THEN GET /api/matches (global) returns at least 3 events
    let all_matches: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/matches"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(
        all_matches.len() >= 3,
        "Expected at least 3 match events from GET /api/matches, got {}",
        all_matches.len()
    );
}

#[test]
fn test_unbans_endpoints() {
    // GIVEN a banned IP that is then manually unbanned
    let proc = TestProcess::start();
    let test_ip = "10.23.0.1";
    let config_id = "cfg-unbans";
    proc.create_config(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Intrusion from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Intrusion from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "IP not banned");

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
        .expect("ban event not found")
        .to_owned();

    // WHEN the ban is disabled via POST /api/bans/{id}/disable
    proc.client()
        .post(proc.api_url(&format!("/api/bans/{}/disable", ban_id)))
        .send()
        .unwrap();
    assert!(proc.wait_for_unban(test_ip, 3000), "Unban event not recorded");

    // THEN the unban appears in both GET /api/unbans and GET /api/unbans/{config_id}
    let unbans: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/unbans"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(
        unbans.iter().any(|u| u["ip"].as_str() == Some(test_ip)),
        "Unban not found in GET /api/unbans"
    );

    let unbans_by_config: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url(&format!("/api/unbans/{}", config_id)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(
        unbans_by_config.iter().any(|u| u["ip"].as_str() == Some(test_ip)),
        "Unban not found in GET /api/unbans/{config_id}"
    );
}
