use crate::utils::TestProcess;

#[test]
fn test_unban_delete_failure_is_ignored() {
    // GIVEN an instance whose iptables refuses to delete rules from the
    // per-config chains ("-D bnz-" matches the unban delete but neither the
    // "-D INPUT -j banalize" unlink nor the "-D banalize -j bnz-…" child
    // unlinks at shutdown), and an IP banned with a 2s ban_time
    let proc = TestProcess::start_with_env(&[("BANALIZE_FAKE_IPTABLES_FAIL", "-D bnz-")]);
    let ip_a = "10.44.0.1";
    let ip_b = "10.44.0.2";
    proc.create_config_with_ban_time(
        "cfg-unban-fail",
        proc.log_file.to_str().unwrap(),
        "Unban hit from <IP>",
        1,
        &[],
        2000,
    );
    proc.append_log_line(&format!("Unban hit from {}", ip_a));
    assert!(proc.wait_for_ban(ip_a, 5000), "initial ban failed");

    // WHEN the ban expires and the firewall rejects the rule deletion

    // THEN the unban is still recorded — firewall errors are logged and
    // ignored, never blocking expiry
    assert!(
        proc.wait_for_unban(ip_a, 10_000),
        "unban event must be recorded even when the firewall delete fails"
    );

    // AND the process is still fully functional: another IP can be banned
    proc.append_log_line(&format!("Unban hit from {}", ip_b));
    assert!(
        proc.wait_for_ban(ip_b, 5000),
        "process must keep banning after a failed unban delete"
    );
}
