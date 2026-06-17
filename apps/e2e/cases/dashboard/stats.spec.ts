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
 * The dashboard stat cards (the shared `DashboardView`) summarise activity. We
 * assert them on the *config-scoped* detail page rather than the global
 * dashboard: the suite runs specs in parallel against one backend, so the global
 * cards aggregate every concurrent test, but the config-scoped cards see only
 * this config. A single known scenario — N matching lines, one ban, one manual
 * unban — must read back exactly: matches = N, bans ≥ 1, unbans = 1. Catches
 * regressions where a card counts the wrong event kind or drops the 24h window.
 */
test.describe("dashboard stats", () => {
  test("config-scoped stat cards reflect the recorded matches, bans and unbans", async ({
    api,
    logInjector,
    bans,
    configDetail,
    dashboard,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    const file = `dash-${suffix}.log`;
    const configId = `dash-${suffix}`;
    const ip = randomIp();
    const maxMatches = 3;
    const matchCount = maxMatches + 2;

    await test.step("Given a config with N matching lines, one ban, then one manual unban", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name: `Dashboard ${suffix}`,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        ban_time: 5 * MINUTE,
        find_time: 5 * MINUTE,
        max_matches: maxMatches,
        ignore_ips: [],
      });

      await sleep(WATCHER_WARMUP_MS);
      await logInjector.failedLogin(file, ip, matchCount);

      // Lift the ban from the UI so there is exactly one unban.
      await bans.goto();
      await bans.search(ip);
      await bans.expectStatus(ip, "active");
      await bans.unban(ip);
      await bans.expectStatus(ip, "unbanned");
    });

    await test.step("When viewing the config-scoped detail dashboard", async () => {
      // The detail page embeds DashboardView scoped to this config only.
      await configDetail.gotoConfig(configId);
    });

    await test.step("Then the stat cards read back the exact matches, bans and unbans", async () => {
      await dashboard.expectMatchCount(matchCount);
      await dashboard.expectBanCountAtLeast(1);
      await dashboard.expectUnbanCount(1);
    });
  });
});
