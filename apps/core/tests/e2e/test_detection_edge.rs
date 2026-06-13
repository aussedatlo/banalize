use crate::utils::TestProcess;

#[test]
fn test_invalid_ip_like_tokens_never_match() {
    // GIVEN a config that bans on the first match
    let proc = TestProcess::start();
    proc.create_config(
        "cfg-invalid-ip",
        proc.log_file.to_str().unwrap(),
        "Attack from <IP>",
        1,
        &[],
    );

    // WHEN lines carry IP-shaped tokens that are not valid IPv4 addresses
    // (octets > 255, or a digit run too long for the \b-guarded pattern),
    // followed by a sentinel line with a real IP
    proc.append_log_line("Attack from 999.300.1.1");
    proc.append_log_line("Attack from 256.1.1.1");
    proc.append_log_line("Attack from 1234.5.6.78");
    let sentinel = "10.30.0.9";
    proc.append_log_line(&format!("Attack from {}", sentinel));

    // THEN only the sentinel is banned. Lines flow through one ordered channel
    // into a sequential detector, so the sentinel ban proves the malformed
    // lines were fully processed — and produced no match event at all.
    assert!(proc.wait_for_ban(sentinel, 5000), "sentinel was not banned");
    assert_eq!(
        proc.match_count("cfg-invalid-ip"),
        1,
        "malformed IP tokens must not produce match events"
    );
    assert_eq!(proc.banned_ips(), vec![sentinel.to_string()]);
}

#[test]
fn test_extra_capture_group_before_ip_placeholder() {
    // GIVEN a regex with a non-IP capture group before the <IP> placeholder
    let proc = TestProcess::start();
    let test_ip = "10.31.0.1";
    proc.create_config(
        "cfg-capture-group",
        proc.log_file.to_str().unwrap(),
        r"user (\S+) failed from <IP>",
        1,
        &[],
    );

    // WHEN a matching line arrives
    proc.append_log_line(&format!("user bob failed from {}", test_ip));

    // THEN the extractor skips the username group and still finds the IP
    assert!(
        proc.wait_for_ban(test_ip, 5000),
        "IP not extracted past a leading non-IP capture group"
    );
}

#[test]
fn test_multiple_ips_on_one_line_first_only() {
    // GIVEN an anchored regex (no leading .*, which would greedily capture the
    // last IP on the line instead of the first)
    let proc = TestProcess::start();
    proc.create_config(
        "cfg-multi-ip",
        proc.log_file.to_str().unwrap(),
        "login from <IP>",
        1,
        &[],
    );

    // WHEN one line contains two IPs
    proc.append_log_line("login from 10.32.0.1 forwarded-for 10.32.0.2");

    // THEN only the IP matched by the placeholder is banned
    assert!(proc.wait_for_ban("10.32.0.1", 5000), "first IP was not banned");
    assert!(
        !proc.banned_ips().contains(&"10.32.0.2".to_string()),
        "second IP on the line must not be banned"
    );
}

#[test]
fn test_burst_of_lines_in_single_write() {
    // GIVEN a config with a threshold of 10 matches
    let proc = TestProcess::start();
    let test_ip = "10.48.0.1";
    proc.create_config(
        "cfg-burst",
        proc.log_file.to_str().unwrap(),
        "Flood from <IP>",
        10,
        &[],
    );

    // WHEN 30 matching lines land in the file in a single write call
    let lines: Vec<String> = (0..30).map(|_| format!("Flood from {}", test_ip)).collect();
    proc.append_log_lines(&lines);

    // THEN the IP is banned and every line is recorded — the tailer→detector
    // channel is lossless (bounded mpsc applies backpressure, never drops)
    assert!(proc.wait_for_ban(test_ip, 5000), "burst did not trigger a ban");
    assert!(
        proc.wait_for_match_count("cfg-burst", 30, 10_000),
        "expected all 30 burst lines recorded, got {}",
        proc.match_count("cfg-burst")
    );
}
