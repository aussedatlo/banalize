use crate::utils::{drop_rule, TestProcess};
use std::thread;
use std::time::Duration;

/// Heavy load: 3 configs fan out over the same log file while 300 distinct
/// IPs cross the threshold within ~1500 interleaved lines (plus noise).
///
/// Every pipeline stage is lossless by contract — tailer→detector mpsc,
/// detector→firewall mpsc, and the audit channel into the batched SQLite
/// writer — so the assertions are exact: one DROP rule per IP in the
/// firewall, and every match/ban event present in the audit log. Any missing
/// or duplicated entry under burst is a real bug, not scheduling noise.
#[test]
fn test_heavy_load_many_ips_multi_config() {
    // GIVEN three configs watching the same file, each with its own regex
    // prefix, IP block and a threshold of 3 matches
    let proc = TestProcess::start();
    let prefixes = ["Alpha", "Bravo", "Charlie"];
    for (i, prefix) in prefixes.iter().enumerate() {
        proc.create_config(
            &format!("cfg-load-{}", prefix.to_lowercase()),
            proc.log_file.to_str().unwrap(),
            &format!("{} hit from <IP>", prefix),
            3,
            &[],
        );
        // 10.60.0.x / 10.61.0.x / 10.62.0.x
        assert!(i <= 2);
    }
    let ips: Vec<(usize, String)> = (0..3)
        .flat_map(|cfg| (1..=100).map(move |host| (cfg, format!("10.{}.0.{}", 60 + cfg, host))))
        .collect();

    // WHEN 4 matching lines per IP (the 4th lands after the ban and must be
    // deduplicated) arrive interleaved across all IPs and configs, mixed with
    // noise, written in rapid chunks
    let mut lines = Vec::new();
    for rep in 0..4 {
        for (cfg, ip) in &ips {
            lines.push(format!("{} hit from {}", prefixes[*cfg], ip));
            if rep == 1 {
                lines.push("GET /index.html 200 from nowhere".to_string());
            }
        }
    }
    let chunks: Vec<&[String]> = lines.chunks(150).collect();
    let mid = chunks.len() / 2;
    for (i, chunk) in chunks.iter().enumerate() {
        proc.append_log_lines(chunk);
        thread::sleep(Duration::from_millis(20));
        if i == mid {
            // AND the API stays responsive in the middle of the flood
            let resp = proc.client().get(proc.api_url("/api/configs")).send().unwrap();
            assert!(resp.status().is_success(), "API unresponsive under load");
        }
    }

    // THEN every IP ends up banned: 300 DROP rules across the three
    // per-config chains ("-A bnz-" matches the child DROP appends but not
    // the parent's "-A banalize -j bnz-…" link rules)
    assert!(
        proc.wait_for_iptables_count("-A bnz-", 300, 90_000),
        "expected 300 DROP rules, got {}",
        proc.count_iptables_occurrences("-A bnz-")
    );

    // AND exactly one rule per IP, in its config's own chain — no duplicates
    // despite the post-ban lines
    for (cfg, ip) in &ips {
        let rule = drop_rule(&format!("cfg-load-{}", prefixes[*cfg].to_lowercase()), ip);
        assert_eq!(
            proc.count_iptables_occurrences(&rule),
            1,
            "IP {} must have exactly one DROP rule",
            ip
        );
    }
    assert_eq!(proc.count_iptables_occurrences("-A bnz-"), 300);

    // AND the audit log is complete: the batched SQLite writer is fed by a
    // lossless channel, so every event must land — 4 match events per IP
    // (the post-ban line still records a match) and one ban event per IP
    for prefix in &prefixes {
        let cfg_id = format!("cfg-load-{}", prefix.to_lowercase());
        assert!(
            proc.wait_for_match_count(&cfg_id, 400, 30_000),
            "audit log lost match events for {}: got {}",
            cfg_id,
            proc.match_count(&cfg_id)
        );
        assert_eq!(proc.match_count(&cfg_id), 400, "match events for {}", cfg_id);
    }
    let banned = proc.banned_ips();
    assert_eq!(banned.len(), 300, "audit log must hold one ban event per IP");
}
