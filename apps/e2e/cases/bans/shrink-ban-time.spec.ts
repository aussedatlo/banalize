import { test } from "../../fixtures";
import { containerLogPath } from "../../utils/config";
import { FAILED_LOGIN_REGEX } from "../../utils/log-injector";
import {
  MINUTE,
  randomIp,
  SECOND,
  sleep,
  uniqueSuffix,
  WATCHER_WARMUP_MS,
} from "../../utils/utils";

/**
 * A ban keeps the effective duration it was issued with: the backend freezes it
 * at creation and the cleaner expires off that stored value, so editing a
 * config's ban_time afterwards does not retroactively shorten a running ban.
 *
 * The UI must reflect that. It used to derive expiry from the *current* config,
 * so cutting ban_time flipped a ban to "expired" while the backend kept it
 * enforced and never emitted an unban — an expired-looking ban with no unban and
 * an IP still blocked. The fix: a ban stays "active" in the UI until the backend
 * actually records an unban.
 */
test.describe("ban duration shortened mid-ban", () => {
  test("cutting ban_time below the time served keeps the ban active until the backend lifts it", async ({
    api,
    logInjector,
    bans,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    const file = `shrink-ban-${suffix}.log`;
    const configId = `shrink-ban-${suffix}`;
    const name = `Shrink ban ${suffix}`;
    const ip = randomIp();
    const maxMatches = 3;

    await test.step("Given an IP banned under a long ban_time", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        // Long enough that it never expires on its own during the test.
        ban_time: 5 * MINUTE,
        find_time: 5 * MINUTE,
        max_matches: maxMatches,
        ignore_ips: [],
      });

      await sleep(WATCHER_WARMUP_MS);
      await logInjector.failedLogin(file, ip, maxMatches + 2);

      await bans.goto();
      await bans.search(ip);
      await bans.expectStatus(ip, "active");
    });

    await test.step("When the config's ban_time is cut below the time already served", async () => {
      await api.updateConfig({
        id: configId,
        name,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        // Now far shorter than the ban that is already running.
        ban_time: 2 * SECOND,
        find_time: 5 * MINUTE,
        max_matches: maxMatches,
        ignore_ips: [],
      });

      // Give the cleaner (5s tick) a couple of cycles to act on the new
      // duration, then reload so the UI reads the new ban_time for the badge.
      await sleep(12 * SECOND);
      await bans.goto();
      await bans.search(ip);
    });

    await test.step("Then the UI still shows the ban as active, with no phantom unban", async () => {
      // The backend froze this ban's duration at creation and recorded no
      // unban, so the IP is still firewalled. The UI reflects that — active,
      // not a phantom "expired" derived from the shortened config.
      await bans.expectStatus(ip, "active");
      await bans.expectNoUnbanRow(ip);
    });
  });
});
