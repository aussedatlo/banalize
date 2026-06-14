import { test } from "../../fixtures";
import { containerLogPath } from "../../utils/config";
import { FAILED_LOGIN_REGEX } from "../../utils/log-injector";
import { MINUTE, SECOND, sleep, uniqueSuffix, WATCHER_WARMUP_MS } from "../../utils/utils";

/**
 * Bans are temporary: once `ban_time` elapses the cleaner lifts them. This is the
 * system's central promise and is exercised end-to-end here (cleaner timer →
 * unban event → SSE → UI status), distinct from the manual unban in
 * lifecycle.spec.ts. The e2e core runs its cleaner every 5s.
 */
test.describe("ban auto-expiry", () => {
  test("a ban lifts itself once ban_time elapses, with no manual action", async ({
    api,
    logInjector,
    bans,
  }) => {
    const suffix = uniqueSuffix();
    const file = `expiry-${suffix}.log`;
    const configId = `expiry-${suffix}`;
    const ip = `198.51.100.${10 + Math.floor(Math.random() * 200)}`;
    const maxMatches = 3;

    await logInjector.create(file);
    await api.createConfig({
      id: configId,
      name: `Expiry ${suffix}`,
      param: containerLogPath(file),
      regex: FAILED_LOGIN_REGEX,
      // Short ban so the cleaner (5s tick) expires it within the test.
      ban_time: 8 * SECOND,
      find_time: 5 * MINUTE,
      max_matches: maxMatches,
      ignore_ips: [],
    });

    await sleep(WATCHER_WARMUP_MS);
    await logInjector.failedLogin(file, ip, maxMatches + 2);

    await bans.goto();
    await bans.expectRowVisible(ip);
    await bans.expectStatus(ip, "active");

    // No unban() call — the cleaner lifts it on its own and the badge flips.
    await bans.expectStatus(ip, "expired");
  });
});
