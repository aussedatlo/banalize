use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

#[test]
fn test_ignore_ip_not_banned() {
    // GIVEN a config with a single IP in the ignore list
    let proc = TestProcess::start();
    let test_ip = "10.3.0.1";
    proc.create_config(
        "cfg-ignore",
        proc.log_file.to_str().unwrap(),
        "Probe from <IP>",
        1,
        &[test_ip],
    );

    // WHEN the log file receives matching lines for the ignored IP
    for _ in 0..3 {
        proc.append_log_line(&format!("Probe from {}", test_ip));
        thread::sleep(Duration::from_millis(50));
    }
    thread::sleep(Duration::from_secs(2));

    // THEN no ban is recorded and no iptables DROP rule is created
    assert!(
        !proc.wait_for_ban(test_ip, 500),
        "Ignored IP {test_ip} was incorrectly banned"
    );
    assert!(
        !proc
            .read_iptables_log()
            .contains(&drop_rule("cfg-ignore", test_ip)),
        "iptables DROP rule was created for ignored IP {test_ip}"
    );
}
