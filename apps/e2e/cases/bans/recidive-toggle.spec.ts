import { expect, test } from "../../fixtures";
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
 * Regression for the flat -> recidive migration bug.
 *
 * A ban created while the config is *flat* is stored in memory with the
 * `ban_time: 0` sentinel (it expires off the config's shared cutoff, not a
 * per-ban duration). Enabling `recidive_multiplicator` on the live config
 * switches the cleaner to the per-ban path (`take_expired_bans_now`), which
 * reads that sentinel literally as a zero-duration ban — so on the next cleaner
 * tick the still-young ban is wrongly expired. A config update restarts the
 * watcher but does NOT re-run restore, so the stale sentinel entry is never
 * refreshed.
 *
 * Expected (correct) behaviour: the active ban keeps its original `ban_time`
 * and stays banned until that elapses, regardless of the mode switch. This spec
 * fails before the fix (a premature unban appears) and passes after it.
 */
test.describe("recidive multiplicator migration", () => {
  test("enabling the multiplicator must not prematurely expire an active flat ban", async ({
    api,
    logInjector,
    bans,
  }) => {
    test.setTimeout(90 * SECOND);

    const suffix = uniqueSuffix();
    const file = `recidive-toggle-${suffix}.log`;
    const configId = `recidive-toggle-${suffix}`;
    const ip = randomIp();
    const maxMatches = 3;
    // Long enough that the ban is clearly still young when we flip the config and
    // a couple of cleaner ticks (5s each in e2e) have passed.
    const banTime = 40 * SECOND;

    // Start flat: no recidive_multiplicator.
    const baseConfig = {
      id: configId,
      name: `Recidive toggle ${suffix}`,
      param: containerLogPath(file),
      regex: FAILED_LOGIN_REGEX,
      ban_time: banTime,
      find_time: 5 * MINUTE,
      max_matches: maxMatches,
      ignore_ips: [],
    };
    const bansForIp = async () =>
      (await api.listBans()).filter(
        (b) => b.ip === ip && b.config_id === configId,
      );
    const unbansForIp = async () =>
      (await api.listUnbans()).filter(
        (u) => u.ip === ip && u.config_id === configId,
      );

    await test.step("Given a flat config (no multiplier)", async () => {
      await logInjector.create(file);
      await api.createConfig(baseConfig);
    });

    await test.step("When an IP is banned under the flat config", async () => {
      // Offend -> first (flat-path) ban, stored with the ban_time: 0 sentinel.
      await sleep(WATCHER_WARMUP_MS);
      await logInjector.failedLogin(file, ip, maxMatches + 2);
      await expect.poll(bansForIp, { timeout: 20_000 }).toHaveLength(1);
      expect(await unbansForIp()).toHaveLength(0);
    });

    await test.step("When the multiplicator is enabled mid-flight", async () => {
      // Flip the live config to recidive while the ban is still well within its
      // 40s window. This restarts the watcher but does not re-run restore.
      await api.updateConfig({ ...baseConfig, recidive_multiplicator: 2 });
      // Give the cleaner several ticks (5s interval in e2e). A correct cleaner
      // leaves the young ban alone; the bug expires it on the first tick.
      await sleep(20 * SECOND);
    });

    await test.step("Then the still-young ban stays active in both the core and the UI", async () => {
      // The ban_time has NOT elapsed, so there must be no unban yet.
      expect(await unbansForIp()).toHaveLength(0);
      expect(await bansForIp()).toHaveLength(1);

      // Under the migration bug the Events table would show expired/unbanned
      // after the mode switch; here it reflects the corrected, active ban.
      await bans.goto();
      await bans.search(ip);
      await bans.expectStatus(ip, "active");
      expect(await bans.activeRemainingSeconds(ip)).toBeGreaterThan(0);
    });
  });
});
