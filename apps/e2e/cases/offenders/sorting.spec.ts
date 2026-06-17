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
 * The Offenders leaderboard is sortable by match count, ban count and last
 * seen, toggling direction on a repeated click. We set up two IPs whose match
 * and ban rankings disagree — one with many matches but no ban, one banned with
 * fewer matches — so each sort key produces a *different* leader, proving the
 * column actually drives the order (and isn't coincidentally aligned).
 */
test.describe("offenders sorting", () => {
  test("sort keys reorder the leaderboard and the direction toggles", async ({
    api,
    logInjector,
    offenders,
  }) => {
    test.setTimeout(60 * SECOND);

    const suffix = uniqueSuffix();
    // One config that never bans (high threshold) → pure match volume.
    const matchFile = `offenders-m-${suffix}.log`;
    const matchConfig = `offenders-m-${suffix}`;
    // One config that bans quickly → fewer matches but a ban.
    const banFile = `offenders-b-${suffix}.log`;
    const banConfig = `offenders-b-${suffix}`;

    const ipMatches = randomIp();
    let ipBanned = randomIp();
    while (ipBanned === ipMatches) ipBanned = randomIp();

    // Polls because the client re-sort lands a tick after the header click.
    const expectLeads = (first: string, second: string) =>
      expect
        .poll(async () => {
          const order = await offenders.rowOrder();
          const a = order.indexOf(first);
          const b = order.indexOf(second);
          return a !== -1 && b !== -1 && a < b;
        })
        .toBe(true);

    await test.step("Given two IPs with diverging match and ban rankings on the leaderboard", async () => {
      await logInjector.create(matchFile);
      await logInjector.create(banFile);
      await api.createConfig({
        id: matchConfig,
        name: `Offenders matches ${suffix}`,
        param: containerLogPath(matchFile),
        regex: FAILED_LOGIN_REGEX,
        ban_time: 5 * MINUTE,
        find_time: 5 * MINUTE,
        max_matches: 100, // effectively never bans
        ignore_ips: [],
      });
      await api.createConfig({
        id: banConfig,
        name: `Offenders bans ${suffix}`,
        param: containerLogPath(banFile),
        regex: FAILED_LOGIN_REGEX,
        ban_time: 5 * MINUTE,
        find_time: 5 * MINUTE,
        max_matches: 3,
        ignore_ips: [],
      });

      await sleep(WATCHER_WARMUP_MS);
      // ipMatches: most matches, no ban. ipBanned: fewer matches, one ban.
      await logInjector.failedLogin(matchFile, ipMatches, 6);
      await logInjector.failedLogin(banFile, ipBanned, 4);

      await offenders.goto();
      await offenders.expectRowVisible(ipMatches);
      await offenders.expectRowVisible(ipBanned);
      // Wait for the ban to register so ban_count is settled before we sort.
      await offenders.expectCounts(ipBanned, { bans: 1 });
    });

    await test.step("When sorting by match count", async () => {
      await offenders.sortBy("match_count");
    });

    await test.step("Then the most-matched IP leads", async () => {
      await expectLeads(ipMatches, ipBanned);
    });

    await test.step("When the match-count sort is clicked again", async () => {
      await offenders.sortBy("match_count");
    });

    await test.step("Then the direction flips and the order reverses", async () => {
      await expectLeads(ipBanned, ipMatches);
    });

    await test.step("When sorting by ban count", async () => {
      await offenders.sortBy("ban_count");
    });

    await test.step("Then the banned IP leads — a different leader", async () => {
      await expectLeads(ipBanned, ipMatches);
    });
  });
});
