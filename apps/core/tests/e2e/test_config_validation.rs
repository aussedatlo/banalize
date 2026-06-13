use crate::utils::TestProcess;

#[test]
fn test_invalid_config_rejected() {
    // GIVEN a running instance
    let proc = TestProcess::start();
    let client = proc.client();
    let url = proc.api_url("/api/configs");
    let log = proc.log_file.to_str().unwrap();

    let config = |id: &str, regex: &str, max_matches: u32, ban_time: u64, find_time: u64, name: &str, param: &str| {
        serde_json::json!({
            "id": id, "name": name, "param": param, "regex": regex,
            "ban_time": ban_time, "find_time": find_time,
            "max_matches": max_matches, "ignore_ips": [],
        })
    };

    // WHEN a config with a regex missing the <IP> placeholder is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("v1", "no placeholder here", 1, 1000, 1000, "v1", log)).send().unwrap().status(),
        400, "expected 400 for regex without <IP>"
    );

    // WHEN a config with an empty id is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("", "test <IP>", 1, 1000, 1000, "v2", log)).send().unwrap().status(),
        400, "expected 400 for empty id"
    );

    // WHEN a config with an empty name is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("v3", "test <IP>", 1, 1000, 1000, "", log)).send().unwrap().status(),
        400, "expected 400 for empty name"
    );

    // WHEN a config with an empty param (log file path) is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("v4", "test <IP>", 1, 1000, 1000, "v4", "")).send().unwrap().status(),
        400, "expected 400 for empty param"
    );

    // WHEN a config with max_matches=0 is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("v5", "test <IP>", 0, 1000, 1000, "v5", log)).send().unwrap().status(),
        400, "expected 400 for max_matches=0"
    );

    // WHEN a config with ban_time=0 is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("v6", "test <IP>", 1, 0, 1000, "v6", log)).send().unwrap().status(),
        400, "expected 400 for ban_time=0"
    );

    // WHEN a config with find_time=0 is submitted
    // THEN 400 is returned
    assert_eq!(
        client.post(&url).json(&config("v7", "test <IP>", 1, 1000, 0, "v7", log)).send().unwrap().status(),
        400, "expected 400 for find_time=0"
    );
}
