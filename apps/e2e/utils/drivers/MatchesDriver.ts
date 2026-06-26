import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

export type MatchStatus = "counting" | "expired";

/** Drives match rows on the merged Events table. */
export class MatchesDriver extends BaseDriver {
  protected readonly path = "/events";

  row(ip: string) {
    return this.byTestId(`matches-row-${ip}`).first();
  }

  async search(query: string): Promise<void> {
    await this.byTestId("table-search").fill(query);
  }

  /**
   * Wait for `ip`'s (first) match row to show the expected window status:
   * "counting" while the match is inside the config's find_time window,
   * "expired" once it ages out. Polls — matches arrive async and the badge
   * flips client-side as the window elapses.
   */
  async expectStatus(ip: string, status: MatchStatus): Promise<void> {
    await expect(this.byTestId(`matches-status-${ip}`).first()).toHaveText(
      status,
      { timeout: 20_000 },
    );
  }

  async expectRowVisible(ip: string): Promise<void> {
    await expect(this.row(ip)).toBeVisible({ timeout: 20_000 });
  }

  async expectNoRow(ip: string): Promise<void> {
    await expect(this.byTestId(`matches-row-${ip}`)).toHaveCount(0);
  }

  /** Expand a match row to reveal its raw log line. */
  async expandRow(ip: string): Promise<void> {
    await this.row(ip).click();
  }

  /**
   * Expand the (first) match row and assert the raw line renders with the regex
   * match highlighted (amber) and the offending IP within it (red). Pass `oneOf`
   * (the lines returned by `logInjector.failedLogin`) to also assert the shown
   * text is exactly one of those injected lines — robust to row ordering when an
   * IP has several identical-timestamp matches.
   */
  async expectMatchedLine(ip: string, oneOf?: string[]): Promise<void> {
    await this.expandRow(ip);
    const line = this.byTestId("highlighted-line");
    await expect(line).toBeVisible({ timeout: 20_000 });
    await expect(this.byTestId("highlighted-line-ip")).toHaveText(ip);
    await expect(this.byTestId("highlighted-line-match")).toContainText(
      "Failed password",
    );
    if (oneOf) expect(oneOf).toContain(await line.innerText());
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("events-empty")).toBeVisible();
  }
}
