use crate::utils::{chain, TestProcess};

/// Regression test for the duplicate-POST rollback bug: create_config used to
/// INSERT OR REPLACE before starting the watcher, and the "watcher already
/// exists" rollback then deleted the ORIGINAL config row while its watcher
/// kept running (zombie). Duplicates must be rejected up front with 409.
#[test]
fn test_duplicate_config_id_post_preserves_original() {
    // GIVEN an existing, working config
    let proc = TestProcess::start();
    let test_ip = "10.46.0.1";
    proc.create_config(
        "cfg-dup",
        proc.log_file.to_str().unwrap(),
        "Dup hit from <IP>",
        1,
        &[],
    );

    // WHEN the same id is POSTed again with different settings
    let duplicate = serde_json::json!({
        "id": "cfg-dup",
        "name": "imposter",
        "param": proc.log_file.to_str().unwrap(),
        "regex": "Other <IP>",
        "ban_time": 60000,
        "find_time": 60000,
        "max_matches": 99,
        "ignore_ips": [],
    });
    let resp = proc.post_config_raw(&duplicate);

    // THEN the duplicate is rejected with 409 and the original config survives
    assert_eq!(resp.status(), reqwest::StatusCode::CONFLICT);
    let config: serde_json::Value = proc
        .client()
        .get(proc.api_url("/api/configs/cfg-dup"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert_eq!(config["name"].as_str(), Some("cfg-dup"));
    assert_eq!(config["regex"].as_str(), Some("Dup hit from <IP>"));

    // AND its watcher still works
    proc.append_log_line(&format!("Dup hit from {}", test_ip));
    assert!(
        proc.wait_for_ban(test_ip, 5000),
        "original watcher must keep working after a rejected duplicate"
    );
}

/// Regression test for the deleted-config ban leak: the cleaner only visits
/// configs that still exist, so bans for a deleted config were never expired
/// and their DROP rules leaked until shutdown. Deleting a config must lift
/// its active bans.
#[test]
fn test_delete_config_lifts_active_ban() {
    // GIVEN a config with an active ban
    let proc = TestProcess::start();
    let test_ip = "10.47.0.1";
    proc.create_config(
        "cfg-del-ban",
        proc.log_file.to_str().unwrap(),
        "Del hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Del hit from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "initial ban failed");

    // WHEN the config is deleted
    let resp = proc
        .client()
        .delete(proc.api_url("/api/configs/cfg-del-ban"))
        .send()
        .unwrap();
    assert_eq!(resp.status(), reqwest::StatusCode::NO_CONTENT);

    // THEN the ban is lifted by tearing down the config's chain entirely
    // (flush, unlink from the parent, delete) and an unban is recorded
    let cfg_chain = chain("cfg-del-ban");
    assert!(
        proc.wait_for_iptables_contains(&format!("-X {}", cfg_chain), 5000),
        "deleting a config must remove its chain:\n{}",
        proc.read_iptables_log()
    );
    let log = proc.read_iptables_log();
    assert!(log.contains(&format!("-F {}", cfg_chain)), "chain not flushed:\n{}", log);
    assert!(
        log.contains(&format!("-D banalize -j {}", cfg_chain)),
        "chain not unlinked from parent:\n{}",
        log
    );
    assert!(
        proc.wait_for_unban(test_ip, 5000),
        "deleting a config must record unban events for its active bans"
    );
}

/// Regression test for regex validation: only the presence of <IP> was
/// checked, so an uncompilable pattern was accepted and silently never
/// matched anything (dead config).
#[test]
fn test_uncompilable_regex_rejected() {
    // GIVEN a running instance
    let proc = TestProcess::start();

    // WHEN a config with a regex that does not compile is POSTed
    let body = serde_json::json!({
        "id": "cfg-bad-regex",
        "name": "cfg-bad-regex",
        "param": proc.log_file.to_str().unwrap(),
        "regex": "<IP>([",
        "ban_time": 60000,
        "find_time": 60000,
        "max_matches": 1,
        "ignore_ips": [],
    });
    let resp = proc.post_config_raw(&body);

    // THEN it is rejected with 400 instead of becoming a dead config
    assert_eq!(resp.status(), reqwest::StatusCode::BAD_REQUEST);
    let resp = proc
        .client()
        .get(proc.api_url("/api/configs/cfg-bad-regex"))
        .send()
        .unwrap();
    assert_eq!(resp.status(), reqwest::StatusCode::NOT_FOUND);
}

/// PUT updates an existing config; creation goes through POST. PUT used to
/// silently upsert unknown ids.
#[test]
fn test_put_nonexistent_config_returns_404() {
    // GIVEN a running instance with no config named "ghost"
    let proc = TestProcess::start();

    // WHEN a valid body is PUT to the unknown id
    let body = serde_json::json!({
        "id": "ghost",
        "name": "ghost",
        "param": proc.log_file.to_str().unwrap(),
        "regex": "Ghost <IP>",
        "ban_time": 60000,
        "find_time": 60000,
        "max_matches": 1,
        "ignore_ips": [],
    });
    let resp = proc.put_config_raw("ghost", &body);

    // THEN the API answers 404 and no config is created
    assert_eq!(resp.status(), reqwest::StatusCode::NOT_FOUND);
    let configs: Vec<serde_json::Value> = proc
        .client()
        .get(proc.api_url("/api/configs"))
        .send()
        .unwrap()
        .json()
        .unwrap();
    assert!(
        !configs.iter().any(|c| c["id"].as_str() == Some("ghost")),
        "PUT must not create configs"
    );
}

/// Pinned contract: DELETE is idempotent — deleting an unknown id is a no-op
/// success (204), not an error.
#[test]
fn test_delete_nonexistent_config_is_idempotent() {
    // GIVEN a running instance with no config named "ghost"
    let proc = TestProcess::start();

    // WHEN the unknown id is deleted
    let resp = proc
        .client()
        .delete(proc.api_url("/api/configs/ghost"))
        .send()
        .unwrap();

    // THEN the API answers 204
    assert_eq!(resp.status(), reqwest::StatusCode::NO_CONTENT);
}
