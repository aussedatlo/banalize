use crate::utils::TestProcess;
use std::thread;
use std::time::Duration;

#[test]
fn test_get_config_by_id() {
    // GIVEN a created config
    let proc = TestProcess::start();
    let config_id = "cfg-get-by-id";
    proc.create_config(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Lookup <IP>",
        3,
        &["10.0.0.0/8"],
    );

    // WHEN fetching the config by its ID
    let config: serde_json::Value = proc
        .client()
        .get(proc.api_url(&format!("/api/configs/{}", config_id)))
        .send()
        .unwrap()
        .json()
        .unwrap();

    // THEN all fields are returned correctly
    assert_eq!(config["id"].as_str(), Some(config_id));
    assert_eq!(config["max_matches"].as_u64(), Some(3));
    assert_eq!(config["regex"].as_str(), Some("Lookup <IP>"));
    assert_eq!(config["ignore_ips"][0].as_str(), Some("10.0.0.0/8"));

    // WHEN fetching a non-existent config ID
    let status = proc
        .client()
        .get(proc.api_url("/api/configs/does-not-exist"))
        .send()
        .unwrap()
        .status();

    // THEN 404 is returned
    assert_eq!(status, 404);
}

#[test]
fn test_update_config_changes_threshold() {
    // GIVEN a config with a high threshold (max_matches=5)
    let proc = TestProcess::start();
    let test_ip = "10.20.0.1";
    let config_id = "cfg-update";
    proc.create_config(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Update test <IP>",
        5,
        &[],
    );

    // WHEN the config is updated to lower the threshold to max_matches=1
    let updated = serde_json::json!({
        "id": config_id,
        "name": config_id,
        "param": proc.log_file.to_str().unwrap(),
        "regex": "Update test <IP>",
        "ban_time": 60000,
        "find_time": 60000,
        "max_matches": 1,
        "ignore_ips": [],
    });
    let resp = proc
        .client()
        .put(proc.api_url(&format!("/api/configs/{}", config_id)))
        .json(&updated)
        .send()
        .unwrap();
    assert_eq!(resp.status(), 200, "PUT config failed");

    // THEN the stored config reflects the new threshold
    let stored: serde_json::Value = proc
        .client()
        .get(proc.api_url(&format!("/api/configs/{}", config_id)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(stored["max_matches"].as_u64(), Some(1));

    thread::sleep(Duration::from_millis(200)); // allow restarted watcher to register

    // AND a single log line now triggers a ban under the new threshold
    proc.append_log_line(&format!("Update test {}", test_ip));
    assert!(
        proc.wait_for_ban(test_ip, 5000),
        "IP {test_ip} was not banned after threshold was reduced to 1"
    );
}
