use crate::utils::TestProcess;

#[test]
fn test_get_unknown_config_returns_404() {
    // GIVEN a running instance with no configs
    let proc = TestProcess::start();

    // WHEN an unknown config id is requested
    let resp = proc
        .client()
        .get(proc.api_url("/api/configs/does-not-exist"))
        .send()
        .unwrap();

    // THEN the API answers 404
    assert_eq!(resp.status(), reqwest::StatusCode::NOT_FOUND);
}

#[test]
fn test_put_config_id_mismatch_returns_400() {
    // GIVEN an existing config
    let proc = TestProcess::start();
    proc.create_config(
        "cfg-mismatch",
        proc.log_file.to_str().unwrap(),
        "Mismatch hit from <IP>",
        1,
        &[],
    );

    // WHEN a PUT body carries a different id than the path
    let body = serde_json::json!({
        "id": "cfg-other",
        "name": "cfg-other",
        "param": proc.log_file.to_str().unwrap(),
        "regex": "Changed <IP>",
        "ban_time": 60000,
        "find_time": 60000,
        "max_matches": 5,
        "ignore_ips": [],
    });
    let resp = proc.put_config_raw("cfg-mismatch", &body);

    // THEN the request is rejected and the original config is unchanged
    assert_eq!(resp.status(), reqwest::StatusCode::BAD_REQUEST);
    let config: serde_json::Value = proc
        .client()
        .get(proc.api_url("/api/configs/cfg-mismatch"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(config["regex"].as_str(), Some("Mismatch hit from <IP>"));
}
