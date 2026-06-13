use crate::utils::TestProcess;

#[test]
fn test_ip_stats_aggregate_per_ip() {
    // GIVEN two configs and three IPs with different activity levels:
    // heavy makes 3 matches + a ban under cfg-stats-a, light makes 1 match
    // under cfg-stats-a, other makes 2 matches under cfg-stats-b
    let proc = TestProcess::start();
    let heavy = "10.56.0.1";
    let light = "10.56.0.2";
    let other = "10.56.0.3";
    proc.create_config(
        "cfg-stats-a",
        proc.log_file.to_str().unwrap(),
        "StatsA hit from <IP>",
        3,
        &[],
    );
    proc.create_config(
        "cfg-stats-b",
        proc.log_file.to_str().unwrap(),
        "StatsB hit from <IP>",
        5,
        &[],
    );
    for _ in 0..3 {
        proc.append_log_line(&format!("StatsA hit from {}", heavy));
    }
    proc.append_log_line(&format!("StatsA hit from {}", light));
    proc.append_log_line(&format!("StatsB hit from {}", other));
    proc.append_log_line(&format!("StatsB hit from {}", other));
    assert!(proc.wait_for_ban(heavy, 5000), "heavy IP was not banned");
    assert!(
        proc.wait_for_match_count("cfg-stats-a", 4, 5000)
            && proc.wait_for_match_count("cfg-stats-b", 2, 5000),
        "matches were not recorded"
    );

    // WHEN per-IP stats are requested
    let stats: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/ips/stats"))
        .send()
        .unwrap()
        .json()
        .unwrap();

    // THEN each IP is aggregated correctly and the heaviest offender is first
    let by_ip = |ip: &str| {
        stats
            .iter()
            .find(|s| s["ip"].as_str() == Some(ip))
            .unwrap_or_else(|| panic!("{ip} missing from stats: {stats:?}"))
            .clone()
    };
    let h = by_ip(heavy);
    assert_eq!(h["match_count"].as_u64(), Some(3));
    assert_eq!(h["ban_count"].as_u64(), Some(1));
    assert_eq!(h["config_ids"].as_array().map(Vec::len), Some(1));
    let l = by_ip(light);
    assert_eq!(l["match_count"].as_u64(), Some(1));
    assert_eq!(l["ban_count"].as_u64(), Some(0));
    let o = by_ip(other);
    assert_eq!(o["match_count"].as_u64(), Some(2));
    assert_eq!(stats[0]["ip"].as_str(), Some(heavy), "heaviest first");

    // AND the config filter narrows the aggregation
    let filtered: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/ips/stats?config_id=cfg-stats-b"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(filtered.len(), 1, "only cfg-stats-b IPs expected: {filtered:?}");
    assert_eq!(filtered[0]["ip"].as_str(), Some(other));

    // AND a since filter in the future excludes everything
    let future_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as u64
        + 3_600_000;
    let none: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url(&format!("/api/ips/stats?since={future_ms}")))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(none.is_empty(), "future since should exclude all IPs: {none:?}");
}
