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

/** Short window so a single match flips counting → expired within the test. */
const FIND_TIME = 6 * SECOND;

/**
 * Each match row carries a window status telling whether it still counts toward
 * a ban: "counting" while it sits inside the config's find_time window, then
 * "expired" once it ages out. The badge is derived client-side from find_time,
 * so a short window lets us watch a single sub-threshold match flip from one to
 * the other without ever tripping a ban.
 */
test.describe("match window status", () => {
  test("a match reads counting inside its find_time window, then expired once it ages out", async ({
    api,
    logInjector,
    matches,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    const file = `match-status-${suffix}.log`;
    const configId = `match-status-${suffix}`;
    const ip = randomIp();

    await test.step("Given a config with a short find_time and a high ban threshold", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name: `Match status ${suffix}`,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        ban_time: 5 * MINUTE,
        find_time: FIND_TIME,
        // High enough that a single match never trips a ban — we isolate the
        // match's own window status, not the ban flow.
        max_matches: 5,
        ignore_ips: [],
      });
      await sleep(WATCHER_WARMUP_MS);
    });

    await test.step("When the IP produces a single match", async () => {
      await matches.goto();
      await matches.search(ip);
      await logInjector.failedLogin(file, ip, 1);
    });

    await test.step("Then it reads counting, then flips to expired once the window elapses", async () => {
      // The badge tracks the find_time window off the client clock: it shows
      // "counting" while the match is fresh, then flips to "expired" in place
      // (the row stays — match events are kept in the durable audit log).
      await matches.expectStatus(ip, "counting");
      await matches.expectStatus(ip, "expired");
    });
  });
});
