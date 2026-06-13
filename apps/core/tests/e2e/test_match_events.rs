use crate::utils::TestProcess;
use std::thread;
use std::time::Duration;

#[test]
fn test_match_events_recorded() {
    // GIVEN a config with a high ban threshold (so no ban fires during the test)
    let proc = TestProcess::start();
    let test_ip = "10.9.0.1";
    let config_id = "cfg-matches";
    proc.create_config_with_ban_time(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Request from <IP>",
        5,
        &[],
        60000,
    );

    // WHEN 3 matching lines are written to the log file
    for _ in 0..3 {
        proc.append_log_line(&format!("Request from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_millis(500)); // allow async sqlite handler to flush

    // THEN all 3 match events are recorded in the SQLite events DB
    let matches: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url(&format!("/api/matches/{}", config_id)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(matches.len(), 3, "Expected 3 match events, got {}", matches.len());
    assert!(
        matches.iter().all(|m| m["ip"].as_str() == Some(test_ip)),
        "Not all match events have the expected IP {test_ip}: {:?}",
        matches
    );
    let expected_line = format!("Request from {}", test_ip);
    assert!(
        matches
            .iter()
            .all(|m| m["line"].as_str() == Some(expected_line.as_str())),
        "Match events must carry the raw matched line: {:?}",
        matches
    );
}
