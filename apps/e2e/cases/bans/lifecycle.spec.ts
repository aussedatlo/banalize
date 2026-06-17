import { expect, test } from "../../fixtures";
import { containerLogPath } from "../../utils/config";
import { FAILED_LOGIN_REGEX } from "../../utils/log-injector";
import {
  MINUTE,
  randomIp,
  sleep,
  uniqueSuffix,
  WATCHER_WARMUP_MS,
} from "../../utils/utils";

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
    const ip = randomIp();
    const maxMatches = 3;

    await test.step("Given a config watching a log file", async () => {
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
    });

    const lines =
      await test.step("When failed logins are injected past the threshold", async () => {
        // Let the tailer task start and seek to EOF, then inject past the threshold.
        await sleep(WATCHER_WARMUP_MS);
        return logInjector.failedLogin(file, ip, maxMatches + 2);
      });

    await test.step("Then the ban surfaces across the Bans, Matches, Offenders and Dashboard pages", async () => {
      // The ban shows up on the Bans page as active...
      await bans.goto();
      await bans.expectRowVisible(ip);
      await bans.expectStatus(ip, "active");

      // ...the triggering matches are recorded, and expanding one shows the exact
      // raw log line with the regex match (amber) and the IP (red) highlighted...
      await matches.goto();
      await matches.expectRowVisible(ip);
      await matches.expectMatchedLine(ip, lines);

      // ...the IP appears on the Offenders leaderboard with its match/ban tally...
      await offenders.goto();
      await offenders.expectRowVisible(ip);
      await offenders.expectCounts(ip, { matches: maxMatches + 2, bans: 1 });

      // ...and the dashboard ban counter reflects it.
      await dashboard.goto();
      await dashboard.expectBanCountAtLeast(1);
    });

    await test.step("When the ban is lifted from the UI", async () => {
      await bans.goto();
      await bans.expectStatus(ip, "active");
      await bans.unban(ip);
    });

    await test.step("Then its status flips to unbanned and the unban persists in the core", async () => {
      await bans.expectStatus(ip, "unbanned");
      await expect
        .poll(async () => (await api.listBans()).length)
        .toBeGreaterThanOrEqual(1);
    });
  });
});
