import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

type SortKey = "match_count" | "ban_count" | "last_seen";

/** Drives the Offenders leaderboard table. */
export class OffendersDriver extends BaseDriver {
  protected readonly path = "/offenders";

  row(ip: string) {
    return this.byTestId(`offenders-row-${ip}`);
  }

  async search(query: string): Promise<void> {
    await this.byTestId("table-search").fill(query);
  }

  async sortBy(key: SortKey): Promise<void> {
    await this.byTestId(`offenders-sort-${key}`).click();
  }

  /** The IPs of the currently-rendered rows, in DOM (sorted) order. */
  async rowOrder(): Promise<string[]> {
    const ids = await this.page
      .locator('[data-testid^="offenders-row-"]')
      .evaluateAll((rows) =>
        rows.map((r) => r.getAttribute("data-testid") ?? ""),
      );
    return ids.map((id) => id.replace("offenders-row-", ""));
  }

  async expectRowVisible(ip: string): Promise<void> {
    await expect(this.row(ip)).toBeVisible({ timeout: 20_000 });
  }

  async expectCounts(
    ip: string,
    counts: { matches?: number; bans?: number },
  ): Promise<void> {
    if (counts.matches !== undefined) {
      await expect(this.byTestId(`offenders-matches-${ip}`)).toHaveText(
        String(counts.matches),
      );
    }
    if (counts.bans !== undefined) {
      await expect(this.byTestId(`offenders-bans-${ip}`)).toHaveText(
        String(counts.bans),
      );
    }
  }

  /** Click an offender row, which navigates to its event timeline. */
  async openEventsFor(ip: string): Promise<void> {
    await this.row(ip).click();
    await this.page.waitForURL("**/events**");
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("offenders-empty")).toBeVisible();
  }
}
