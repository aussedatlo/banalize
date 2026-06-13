use crate::utils::TestProcess;

#[test]
fn test_ip_infos_degrade_gracefully_without_database() {
    // GIVEN an instance with GeoIP auto-download disabled and no mmdb on disk
    let proc = TestProcess::start();

    // WHEN country info is requested for valid and invalid inputs
    let infos: serde_json::Value = proc
        .client()
        .get(proc.api_url("/api/ip-infos?ips=8.8.8.8, 1.1.1.1,not-an-ip"))
        .send()
        .unwrap()
        .json()
        .unwrap();

    // THEN every requested key is present with empty info — the endpoint
    // degrades, it never errors
    for key in ["8.8.8.8", "1.1.1.1", "not-an-ip"] {
        let info = &infos[key];
        assert!(info.is_object(), "missing key {key}: {infos}");
        assert!(info["country_code"].is_null());
        assert!(info["flag"].is_null());
    }
}
