use crate::utils::{drop_rule, TestProcess};

#[test]
fn test_weird_config_id_still_produces_working_chain() {
    // GIVEN a config whose id contains spaces, specials and exceeds the
    // 28-char iptables chain-name budget — chain_name() must sanitize,
    // truncate and hash it into a valid, deterministic chain name
    let proc = TestProcess::start();
    let weird_id = "My Weird Config Id! (way/too/long for iptables)";
    let test_ip = "10.54.0.1";
    proc.create_config(
        weird_id,
        proc.log_file.to_str().unwrap(),
        "Weird hit from <IP>",
        1,
        &[],
    );

    // WHEN the config bans an IP
    proc.append_log_line(&format!("Weird hit from {}", test_ip));

    // THEN the rule lands in the sanitized chain. The helper duplicates the
    // production chain_name() logic, so this passing proves the two agree
    // end-to-end (hash suffix included).
    assert!(proc.wait_for_ban(test_ip, 5000), "ban was not recorded");
    assert!(
        proc.wait_for_iptables_contains(&drop_rule(weird_id, test_ip), 5000),
        "rule not found in sanitized chain {:?}:\n{}",
        drop_rule(weird_id, test_ip),
        proc.read_iptables_log()
    );
}
