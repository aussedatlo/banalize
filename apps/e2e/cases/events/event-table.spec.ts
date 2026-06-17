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

  test("a ban never interleaves with the matches that triggered it", async ({
    api,
    logInjector,
    bans,
    matches,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    const file = `events-order-${suffix}.log`;
    const configId = `events-order-${suffix}`;
    const ip = randomIp();
    const maxMatches = 4;

    await test.step("Given a config that bans after a series of matches", async () => {
      await logInjector.create(file);
      await api.createConfig({
        id: configId,
        name: `Events order ${suffix}`,
        param: containerLogPath(file),
        regex: FAILED_LOGIN_REGEX,
        ban_time: 5 * MINUTE,
        find_time: 5 * MINUTE,
        max_matches: maxMatches,
        ignore_ips: [],
      });
      await sleep(WATCHER_WARMUP_MS);
    });

    await test.step("When the IP trips the rule with spaced-out matches", async () => {
      // Inject one line at a time with a gap so each match lands at a distinct,
      // increasing timestamp. Distinct match timestamps are what made the old
      // bug observable: the ban used to reuse the triggering match's timestamp,
      // so it tied with that match and sorted *between* the matches. The ban now
      // stamps its own (strictly later) time, so it must sort above all of them.
      for (let i = 0; i < maxMatches; i++) {
        await logInjector.failedLogin(file, ip, 1);
        await sleep(250);
      }

      await bans.goto();
      await bans.search(ip);
      await bans.expectStatus(ip, "active");
      await matches.expectRowVisible(ip);
    });

    await test.step("Then the ban is the newest row, sitting above every match", async () => {
      const kinds = await bans.rowKindsInOrder(ip);

      expect(
        kinds.filter((k) => k === "match"),
        "all spaced-out matches should be listed",
      ).toHaveLength(maxMatches);

      // Reverse-chronological timeline: the ban is the latest event for this IP,
      // so it sits above every match that caused it. No match may appear before
      // (above) the ban — that would mean the ban interleaved with its matches.
      const banIndex = kinds.indexOf("ban");
      expect(banIndex, "the ban row should be present").toBeGreaterThanOrEqual(
        0,
      );
      expect(
        kinds.slice(0, banIndex).includes("match"),
        `no match should appear before the ban (order: ${kinds.join(", ")})`,
      ).toBe(false);
    });
  });
});
