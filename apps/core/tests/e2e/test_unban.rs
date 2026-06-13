use crate::utils::{del_drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_unban_removes_iptables_rule() {
    // GIVEN a banned IP
    let proc = TestProcess::start();
    let test_ip = "10.2.0.1";
    proc.create_config(
        "cfg-unban",
        proc.log_file.to_str().unwrap(),
        "Bad request from <IP>",
        2,
        &[],
    );
    for _ in 0..2 {
        proc.append_log_line(&format!("Bad request from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    assert!(proc.wait_for_ban(test_ip, 5000), "IP {test_ip} was not banned");

    // WHEN the ban is manually disabled via the API
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
    let resp = proc
        .client()
        .post(proc.api_url(&format!("/api/bans/{}/disable", ban_id)))
        .send()
        .unwrap();
    assert_eq!(resp.status(), 200);

    // THEN the iptables DROP rule is removed
    assert!(
        proc.wait_for_iptables_contains(&del_drop_rule("cfg-unban", test_ip), 3000),
        "iptables -D rule not found in log:\n{}",
        proc.read_iptables_log()
    );
}
