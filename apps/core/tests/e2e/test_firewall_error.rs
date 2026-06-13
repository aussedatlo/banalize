use crate::utils::TestProcess;

#[test]
fn test_firewall_append_failure_is_ignored() {
    // GIVEN an instance whose iptables refuses to add DROP rules to the
    // per-config chains. BANALIZE_FAKE_IPTABLES_FAIL makes the fake binary exit
    // non-zero for any command containing "-A bnz-" — i.e. the deny append, but
    // not the parent chain setup nor the "-A banalize -j bnz-…" child link.
    let proc = TestProcess::start_with_env(&[("BANALIZE_FAKE_IPTABLES_FAIL", "-A bnz-")]);
    let test_ip = "10.21.0.1";
    proc.create_config(
        "cfg-fwfail",
        proc.log_file.to_str().unwrap(),
        "Attack from <IP>",
        1,
        &[],
    );

    // WHEN an IP crosses the threshold and the firewall append fails
    proc.append_log_line(&format!("Attack from {}", test_ip));

    // THEN the ban is still recorded: per spec, firewall errors are logged and
    // ignored, they must not block the ban being persisted and exposed via the API.
    assert!(
        proc.wait_for_ban(test_ip, 5000),
        "ban must be recorded even when the firewall rejects the rule"
    );
}
