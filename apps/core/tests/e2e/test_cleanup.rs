use crate::utils::{chain, TestProcess};

#[test]
fn test_cleanup_on_shutdown() {
    // GIVEN a running binary
    let mut proc = TestProcess::start();

    // WHEN the binary receives SIGTERM and shuts down gracefully
    proc.stop();

    // THEN Firewall::cleanup() removes all chain rules and deletes the banalize chain
    let log = proc.read_iptables_log();
    assert!(
        log.contains("-F banalize"),
        "iptables -F banalize not found in shutdown log:\n{}",
        log
    );
    assert!(
        log.contains("-D INPUT -j banalize"),
        "iptables -D INPUT -j banalize not found in shutdown log:\n{}",
        log
    );
    assert!(
        log.contains("-X banalize"),
        "iptables -X banalize not found in shutdown log:\n{}",
        log
    );
}

#[test]
fn test_cleanup_removes_config_chains() {
    // GIVEN a running binary with an active ban in a per-config chain
    let mut proc = TestProcess::start();
    let test_ip = "10.50.0.1";
    proc.create_config(
        "cfg-cleanup-child",
        proc.log_file.to_str().unwrap(),
        "Cleanup hit from <IP>",
        1,
        &[],
    );
    proc.append_log_line(&format!("Cleanup hit from {}", test_ip));
    assert!(proc.wait_for_ban(test_ip, 5000), "initial ban failed");

    // WHEN the binary receives SIGTERM and shuts down gracefully
    proc.stop();

    // THEN the config's child chain is flushed and deleted along with the parent
    let log = proc.read_iptables_log();
    let cfg_chain = chain("cfg-cleanup-child");
    assert!(
        log.contains(&format!("-F {}", cfg_chain)),
        "child chain not flushed at shutdown:\n{}",
        log
    );
    assert!(
        log.contains(&format!("-X {}", cfg_chain)),
        "child chain not deleted at shutdown:\n{}",
        log
    );
    assert!(log.contains("-X banalize"), "parent chain not deleted:\n{}", log);
}
