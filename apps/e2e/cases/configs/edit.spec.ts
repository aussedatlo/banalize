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
 * Editing a live config must take effect immediately: the core restarts the
 * watcher on update (re-seeking the log file to EOF) and applies the new rule
 * without a manual restart. These specs drive the edit through the UI form
 * rather than the API, covering the operator's real path.
 */
test.describe("config edit on the fly", () => {
  test("lowering the match threshold mid-flight bans on the next hit, not retroactively", async ({
    api,
    logInjector,
    configDetail,
    bans,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    const file = `edit-${suffix}.log`;
    const configId = `edit-${suffix}`;
    const ip = randomIp();

    const bansForIp = async () =>
      (await api.listBans()).filter(
        (b) => b.ip === ip && b.config_id === configId,
      );
    const matchesForIp = async () =>
      (await api.listMatches()).filter(
        (m) => m.ip === ip && m.config_id === configId,
      );

    await test.step("Given a live config with a match threshold of 5", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name: `Edit threshold ${suffix}`,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        ban_time: 5 * MINUTE,
        find_time: 5 * MINUTE,
        max_matches: 5,
        ignore_ips: [],
      });
    });

    await test.step("When a burst of 3 failed logins arrives", async () => {
      await sleep(WATCHER_WARMUP_MS);
      await logInjector.failedLogin(file, ip, 3);
      // Wait for the matches to be recorded so the count is settled.
      await expect.poll(matchesForIp, { timeout: 20_000 }).toHaveLength(3);
    });

    await test.step("Then the IP is not banned (3 < 5)", async () => {
      expect(await bansForIp()).toHaveLength(0);
    });

    await test.step("When the threshold is lowered to 2 via the edit form", async () => {
      await configDetail.gotoConfig(configId);
      await configDetail.editMaxMatches(2);
      await expect
        .poll(
          async () =>
            (await api.listConfigs()).find((c) => c.id === configId)
              ?.max_matches,
        )
        .toBe(2);
    });

    await test.step("Then lowering alone does not retroactively ban (no new match yet)", async () => {
      // Give the restarted watcher and a cleaner tick time to act; a correct
      // core only re-evaluates on a fresh match, so the 3 prior hits stay safe.
      await sleep(8 * SECOND);
      expect(await bansForIp()).toHaveLength(0);
    });

    await test.step("When one more failed login arrives", async () => {
      await logInjector.failedLogin(file, ip, 1);
    });

    await test.step("Then the IP is banned exactly once (now 4 ≥ 2)", async () => {
      await expect.poll(bansForIp, { timeout: 20_000 }).toHaveLength(1);
      await bans.goto();
      await bans.expectRowVisible(ip);
      await bans.expectStatus(ip, "active");
    });
  });

  test("editing a config's name via the UI updates the detail page and persists", async ({
    api,
    configs,
    configDetail,
  }) => {
    const suffix = uniqueSuffix();
    const original = `Edit name ${suffix}`;
    const updated = `Renamed ${suffix}`;

    const id =
      await test.step("Given an existing config created via the UI", async () => {
        await configs.goto();
        return configs.createConfig({
          name: original,
          param: "/var/log/auth.log",
          regex: FAILED_LOGIN_REGEX,
          maxMatches: 5,
        });
      });

    await test.step("When its name is edited from the detail page", async () => {
      await configs.openConfig(id);
      await configDetail.editName(updated);
    });

    await test.step("Then the detail page shows the new name, the id is unchanged, and it persists", async () => {
      await configDetail.expectName(updated);
      const fromApi = (await api.listConfigs()).find((c) => c.id === id);
      expect(fromApi?.name).toBe(updated);
    });
  });
});
