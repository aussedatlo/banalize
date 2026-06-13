use crate::utils::TestProcess;
use std::thread;
use std::time::Duration;

#[test]
fn test_find_time_window() {
    // GIVEN a config with find_time=2s, max_matches=3, and a 1s cleaner interval
    let proc = TestProcess::start();
    let test_ip = "10.7.0.1";
    let config_id = "cfg-findtime";
    let config = serde_json::json!({
        "id": config_id,
        "name": config_id,
        "param": proc.log_file.to_str().unwrap(),
        "regex": "Rejected <IP>",
        "ban_time": 60000,
        "find_time": 2000,
        "max_matches": 3,
        "ignore_ips": [],
    });
    let resp = proc
        .client()
        .post(proc.api_url("/api/configs"))
        .json(&config)
        .send()
        .unwrap();
    assert!(resp.status().is_success(), "Failed to create config");
    thread::sleep(Duration::from_millis(200));

    // WHEN 2 matching lines are written and then the find_time window expires
    for _ in 0..2 {
        proc.append_log_line(&format!("Rejected {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_secs(3)); // cleaner removes matches older than find_time=2s

    // AND 1 more matching line is written (only 1 match now in the window, need 3)
    proc.append_log_line(&format!("Rejected {}", test_ip));
    thread::sleep(Duration::from_secs(1));

    // THEN no ban is triggered because the earlier matches have expired
    assert!(
        !proc.wait_for_ban(test_ip, 500),
        "IP {test_ip} was banned even though prior matches had expired outside find_time window"
    );
}
