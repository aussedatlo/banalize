use crate::utils::TestProcess;
use std::thread;
use std::time::Duration;

#[test]
fn test_delete_config_stops_watching() {
    // GIVEN an active config with a running watcher (confirmed by a match event)
    let proc = TestProcess::start();
    let test_ip = "10.11.0.1";
    let config_id = "cfg-delete";
    proc.create_config(
        config_id,
        proc.log_file.to_str().unwrap(),
        "Attempt from <IP>",
        2,
        &[],
    );
    proc.append_log_line(&format!("Attempt from {}", test_ip));
    thread::sleep(Duration::from_millis(500));
    let matches: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url(&format!("/api/matches/{}", config_id)))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(matches.len(), 1, "Expected 1 match before config deletion");

    // WHEN the config is deleted
    let resp = proc
        .client()
        .delete(proc.api_url(&format!("/api/configs/{}", config_id)))
        .send()
        .unwrap();
    assert_eq!(resp.status(), 204, "DELETE config did not return 204");

    // THEN further matching log lines do not trigger a ban
    for _ in 0..2 {
        proc.append_log_line(&format!("Attempt from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_secs(1));
    assert!(
        !proc.wait_for_ban(test_ip, 500),
        "IP {test_ip} was banned after config was deleted"
    );
}
