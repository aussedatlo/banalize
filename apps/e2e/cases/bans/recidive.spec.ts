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
 * The optional `recidive_multiplicator` makes a repeat offender's ban grow
 * exponentially. With `ban_time = 8s` and `multiplicator = 3`, a first offence
 * earns an 8s ban but a *second* offence by the same IP must earn an ~24s ban —
 * well past the base `ban_time`. Driven through the core API: ban, lift,
 * re-offend, then prove the second ban outlives the flat `ban_time` before the
 * cleaner eventually expires it on its own.
 *
 * Lifting the first ban with the manual disable endpoint (rather than waiting
 * out its expiry) keeps the in-memory recidive counter, so the second ban still
 * escalates — and the test stays fast.
 */
test.describe("recidive multiplicator", () => {
  test("a repeat offender's second ban lasts longer than the base ban_time", async ({
    api,
    logInjector,
    bans,
    configDetail,
  }) => {
    test.setTimeout(90 * SECOND);

    const suffix = uniqueSuffix();
    const file = `recidive-${suffix}.log`;
    const configId = `recidive-${suffix}`;
    const ip = randomIp();
    const maxMatches = 3;
    const banTime = 8 * SECOND;

    const bansForIp = async () =>
      (await api.listBans()).filter(
        (b) => b.ip === ip && b.config_id === configId,
      );
    const unbansForIp = async () =>
      (await api.listUnbans()).filter(
        (u) => u.ip === ip && u.config_id === configId,
      );

    await test.step("Given a config with a recidive multiplier of 3", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name: `Recidive ${suffix}`,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        ban_time: banTime,
        // Long window so the first offence's matches still count when the IP
        // re-offends — the second ban is then cheap to trigger.
        find_time: 5 * MINUTE,
        max_matches: maxMatches,
        ignore_ips: [],
        recidive_multiplicator: 3,
      });
    });

    await test.step("Then the config detail page surfaces the ×3 multiplier", async () => {
      // So an operator sees escalation is enabled without opening the edit form.
      await configDetail.gotoConfig(configId);
      await configDetail.expectRecidiveMultiplier(3);
    });

    await test.step("When the offender is banned, manually lifted, then re-offends", async () => {
      // First offence -> first ban (lasts the base ban_time).
      await sleep(WATCHER_WARMUP_MS);
      await logInjector.failedLogin(file, ip, maxMatches + 2);
      await expect.poll(bansForIp, { timeout: 20_000 }).toHaveLength(1);

      // Lift it manually; the recidive counter survives, so the next escalates.
      const [firstBan] = await bansForIp();
      await api.disableBan(firstBan.id);
      await expect.poll(unbansForIp, { timeout: 20_000 }).toHaveLength(1);

      // Second offence -> second ban, which should last ban_time * 3 (~24s).
      await logInjector.failedLogin(file, ip, maxMatches + 2);
      await expect.poll(bansForIp, { timeout: 20_000 }).toHaveLength(2);
    });

    await test.step("Then the escalated ban renders active with a countdown past the base ban_time", async () => {
      // The merged Events table reflects the client-side `effectiveBanTime`
      // mirroring the backend escalation (a flat ban would show ~8s, not ~24s).
      await bans.goto();
      await bans.search(ip);
      await bans.expectActiveRowVisible(ip);
      expect(await bans.activeRemainingSeconds(ip)).toBeGreaterThan(
        banTime / SECOND,
      );
    });

    await test.step("Then it outlives a flat ban but the cleaner eventually lifts it", async () => {
      // Past the base ban_time (plus a cleaner tick) a *flat* ban would be gone
      // — a second unban. The escalated ban must still be the only one.
      await sleep(banTime + 8 * SECOND);
      expect(await unbansForIp()).toHaveLength(1);

      // ...but it is not permanent: the cleaner lifts it once the longer
      // duration elapses (~24s + tick), producing the second unban.
      await expect.poll(unbansForIp, { timeout: 30_000 }).toHaveLength(2);
    });
  });
});
