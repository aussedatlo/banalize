import { test } from "../../fixtures";
import { containerLogPath } from "../../utils/config";
import { FAILED_LOGIN_REGEX } from "../../utils/log-injector";
import { MINUTE, sleep, uniqueSuffix, WATCHER_WARMUP_MS } from "../../utils/utils";

/**
 * An ignored IP is exempt from banning (the allow-list that keeps you from
 * banning your own admin host). The detector short-circuits before recording a
 * match, so an ignored IP produces neither a match nor a ban.
 *
 * Both IPs are injected into the same file: the normal IP getting banned proves
 * the lines were processed, so the ignored IP's absence is a real exemption and
 * not just a timing artifact.
 */
test.describe("ignored IPs", () => {
  test("an ignored IP is never banned while a normal IP is", async ({
    api,
    logInjector,
    bans,
    matches,
  }) => {
    const suffix = uniqueSuffix();
    const file = `ignore-${suffix}.log`;
    const configId = `ignore-${suffix}`;
    const base = 10 + Math.floor(Math.random() * 100);
    const ignoredIp = `203.0.113.${base}`;
    const normalIp = `203.0.113.${base + 100}`;
    const maxMatches = 3;

    await logInjector.create(file);
    await api.createConfig({
      id: configId,
      name: `Ignore ${suffix}`,
      param: containerLogPath(file),
      regex: FAILED_LOGIN_REGEX,
      ban_time: 5 * MINUTE,
      find_time: 5 * MINUTE,
      max_matches: maxMatches,
      ignore_ips: [ignoredIp],
    });

    await sleep(WATCHER_WARMUP_MS);
    // Inject the ignored IP first, then the normal one (the sentinel).
    await logInjector.failedLogin(file, ignoredIp, maxMatches + 2);
    await logInjector.failedLogin(file, normalIp, maxMatches + 2);

    // Sentinel proves the pipeline ran end-to-end.
    await bans.goto();
    await bans.expectRowVisible(normalIp);
    await bans.expectStatus(normalIp, "active");
    // The ignored IP was processed in the same batch but never banned.
    await bans.expectNoRow(ignoredIp);

    // And it produced no match either (ignore happens before match recording).
    await matches.goto();
    await matches.expectRowVisible(normalIp);
    await matches.expectNoRow(ignoredIp);
  });
});
