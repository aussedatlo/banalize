use crate::utils::TestProcess;
use std::thread;
use std::time::Duration;

/// A regex with a negative lookahead — "ban any 40x response, except requests
/// to allow-listed hosts". The plain `regex` crate rejects `(?!...)` at compile
/// time, which surfaced to the user as a server error when saving the config;
/// fancy-regex accepts it. Hosts here are anonymized stand-ins for the real
/// allow-list the rule was written against.
const REGEX: &str = "<IP> (?!.*(plex|over|minecraft).example.com|coach.example).*40[134]$";

#[test]
fn test_lookahead_regex_config_is_accepted() {
    // GIVEN a running instance
    let proc = TestProcess::start();
    let body = serde_json::json!({
        "id": "cfg-lookahead-accept",
        "name": "cfg-lookahead-accept",
        "param": proc.log_file.to_str().unwrap(),
        "regex": REGEX,
        "ban_time": 60000,
        "find_time": 60000,
        "max_matches": 3,
        "ignore_ips": [],
    });

    // WHEN a config whose regex uses a negative lookahead is submitted
    // THEN it is accepted instead of failing to compile
    let resp = proc.post_config_raw(&body);
    assert!(
        resp.status().is_success(),
        "lookahead regex config was rejected: {}",
        resp.status()
    );
}

#[test]
fn test_lookahead_regex_excludes_allowlisted_hosts() {
    // GIVEN a config that bans on the third 40x line, except for allow-listed hosts
    let proc = TestProcess::start();
    proc.create_config(
        "cfg-lookahead",
        proc.log_file.to_str().unwrap(),
        REGEX,
        3,
        &[],
    );

    let allowed_ip = "10.9.0.1"; // hits an allow-listed host -> lookahead excludes it
    let offender_ip = "10.9.0.2"; // hits an arbitrary host -> should be banned

    // WHEN the allow-listed IP produces 40x lines that match an excluded host
    for _ in 0..3 {
        proc.append_log_line(&format!("{} GET plex.example.com/library HTTP/1.1 404", allowed_ip));
        thread::sleep(Duration::from_millis(50));
    }

    // AND the offending IP produces enough non-excluded 40x lines to be banned
    for _ in 0..3 {
        proc.append_log_line(&format!("{} GET /wp-login.php HTTP/1.1 403", offender_ip));
        thread::sleep(Duration::from_millis(50));
    }

    // THEN the offender is banned (proving the pipeline processed the lines)
    assert!(
        proc.wait_for_ban(offender_ip, 5000),
        "offender IP {offender_ip} was not banned"
    );

    // AND the allow-listed IP is never banned and records no matches: the
    // negative lookahead excluded every one of its lines.
    assert!(
        !proc.banned_ips().contains(&allowed_ip.to_string()),
        "allow-listed IP {allowed_ip} was incorrectly banned"
    );
    assert_eq!(
        proc.match_count("cfg-lookahead"),
        3,
        "expected only the offender's 3 lines to match; allow-listed lines leaked through"
    );
}
