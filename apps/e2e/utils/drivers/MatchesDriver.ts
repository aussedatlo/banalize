import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

/** Drives match rows on the merged Events table. */
export class MatchesDriver extends BaseDriver {
  protected readonly path = "/events";

  row(ip: string) {
    return this.byTestId(`matches-row-${ip}`).first();
  }

  async search(query: string): Promise<void> {
    await this.byTestId("table-search").fill(query);
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

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("events-empty")).toBeVisible();
  }
}
