use crate::utils::TestProcess;

#[test]
fn test_init_creates_chain() {
    // GIVEN a freshly started binary
    // WHEN the binary starts, Firewall::init() runs before the API becomes ready
    let proc = TestProcess::start();

    // THEN the banalize chain is created, linked to INPUT, and flushed
    assert!(
        proc.wait_for_iptables_contains("-N banalize", 1000),
        "iptables -N banalize not found:\n{}",
        proc.read_iptables_log()
    );
    assert!(
        proc.wait_for_iptables_contains("-I INPUT 1 -j banalize", 1000),
        "iptables -I INPUT 1 -j banalize not found:\n{}",
        proc.read_iptables_log()
    );
    assert!(
        proc.wait_for_iptables_contains("-F banalize", 1000),
        "iptables -F banalize not found:\n{}",
        proc.read_iptables_log()
    );
}
