import { expect, test } from "../../fixtures";
import { containerLogPath } from "../../utils/config";
import { FAILED_LOGIN_REGEX } from "../../utils/log-injector";
import { MINUTE, sleep, uniqueSuffix, WATCHER_WARMUP_MS } from "../../utils/utils";

/**
 * The full UI+core end-to-end: a config watches a real log file, injected
 * failed-login lines trip a real ban (iptables), and the ban surfaces across
 * every data-driven page before being lifted from the UI.
 */
test.describe("ban lifecycle", () => {
  test("injected log lines trigger a ban that appears across the UI and can be unbanned", async ({
    api,
    logInjector,
    bans,
    matches,
    offenders,
    dashboard,
  }) => {
    const suffix = uniqueSuffix();
    const file = `auth-${suffix}.log`;
    const configId = `lifecycle-${suffix}`;
    const ip = `198.51.100.${10 + Math.floor(Math.random() * 200)}`;
    const maxMatches = 3;

    // The file must exist before the watcher starts (it seeks to EOF).
    await logInjector.create(file);

    await api.createConfig({
      id: configId,
      name: `Lifecycle ${suffix}`,
      param: containerLogPath(file),
      regex: FAILED_LOGIN_REGEX,
      ban_time: 5 * MINUTE,
      find_time: 5 * MINUTE,
      max_matches: maxMatches,
      ignore_ips: [],
    });

    // Let the tailer task start and seek to EOF, then inject past the threshold.
    await sleep(WATCHER_WARMUP_MS);
    await logInjector.failedLogin(file, ip, maxMatches + 2);

    // The ban shows up on the Bans page as active...
    await bans.goto();
    await bans.expectRowVisible(ip);
    await bans.expectStatus(ip, "active");

    // ...the triggering matches are recorded...
    await matches.goto();
    await matches.expectRowVisible(ip);

    // ...the IP appears on the Offenders leaderboard...
    await offenders.goto();
    await offenders.expectRowVisible(ip);

    // ...and the dashboard ban counter reflects it.
    await dashboard.goto();
    await dashboard.expectBanCountAtLeast(1);

    // Lifting the ban from the UI flips its status to unbanned.
    await bans.goto();
    await bans.expectStatus(ip, "active");
    await bans.unban(ip);
    await bans.expectStatus(ip, "unbanned");

    // And the unban is persisted in the core.
    await expect.poll(async () => (await api.listBans()).length).toBeGreaterThanOrEqual(1);
  });
});
