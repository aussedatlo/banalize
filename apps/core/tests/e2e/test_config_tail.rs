use crate::utils::TestProcess;
use std::io::{BufRead, BufReader};

#[test]
fn test_config_tail_streams_new_lines_only() {
    // GIVEN a watched config whose tailer is proven live by a warm-up match
    let proc = TestProcess::start();
    proc.create_config(
        "cfg-tail",
        proc.log_file.to_str().unwrap(),
        "Tail hit from <IP>",
        99,
        &[],
    );
    proc.append_log_line("Tail hit from 10.57.0.99");
    assert!(
        proc.wait_for_match_count("cfg-tail", 1, 5000),
        "warm-up line was not processed"
    );

    // WHEN subscribing to the tail stream and appending lines afterwards
    let resp = proc
        .client()
        .get(proc.api_url("/api/configs/cfg-tail/tail"))
        .send()
        .unwrap();
    assert!(resp.status().is_success());
    proc.append_log_line("Tail hit from 10.57.0.1");
    proc.append_log_line("unrelated noise line");

    // THEN both new lines arrive in order — and not the pre-subscription one
    let mut reader = BufReader::new(resp);
    let mut got: Vec<serde_json::Value> = Vec::new();
    let mut buf = String::new();
    while got.len() < 2 {
        buf.clear();
        // 0 bytes (stream closed) or Err (5s client timeout): stop collecting.
        if reader.read_line(&mut buf).unwrap_or(0) == 0 {
            break;
        }
        if let Some(data) = buf.strip_prefix("data: ") {
            got.push(serde_json::from_str(data.trim()).unwrap());
        }
    }
    assert_eq!(got.len(), 2, "expected 2 tail events: {got:?}");
    assert_eq!(got[0]["line"].as_str(), Some("Tail hit from 10.57.0.1"));
    assert_eq!(got[1]["line"].as_str(), Some("unrelated noise line"));
    assert!(got[0]["timestamp"].as_u64().unwrap_or(0) > 0);

    // AND tailing a config with no running watcher is a 404
    let resp = proc
        .client()
        .get(proc.api_url("/api/configs/no-such-config/tail"))
        .send()
        .unwrap();
    assert_eq!(resp.status(), 404);
}
