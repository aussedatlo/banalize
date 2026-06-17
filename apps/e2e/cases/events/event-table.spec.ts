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
 * The merged Events table folds match, ban and unban events into one timeline.
 * This guards two behaviours that no other spec covers: a manual unban must add
 * its own unban row (not just flip the ban's status), and the type filter must
 * narrow the timeline to a single event kind.
 */
test.describe("merged events table", () => {
  test("a lifted ban produces an unban row and the type filter narrows the timeline", async ({
    api,
    logInjector,
    bans,
    matches,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    const file = `events-${suffix}.log`;
    const configId = `events-${suffix}`;
    const ip = randomIp();
    const maxMatches = 3;

    await test.step("Given an IP banned by a config", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name: `Events ${suffix}`,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
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

    await test.step("When the ban is lifted from the UI", async () => {
      await bans.unban(ip);
    });

    await test.step("Then the ban reads unbanned and gains its own unban row", async () => {
      await bans.expectStatus(ip, "unbanned");
      // The lift adds its own unban event row to the merged timeline.
      await bans.expectUnbanRowVisible(ip);
    });

    await test.step("When the timeline is filtered to unbans only", async () => {
      await bans.filterByType("unban");
    });

    await test.step("Then only the unban row remains", async () => {
      await bans.expectUnbanRowVisible(ip);
      await bans.expectNoRow(ip); // ban row hidden
      await matches.expectNoRow(ip); // match rows hidden
    });

    await test.step("When the timeline is filtered to matches only", async () => {
      await bans.filterByType("match");
    });

    await test.step("Then only the match rows remain", async () => {
      await matches.expectRowVisible(ip);
      await bans.expectNoRow(ip);
      await bans.expectNoUnbanRow(ip);
    });
  });
});
