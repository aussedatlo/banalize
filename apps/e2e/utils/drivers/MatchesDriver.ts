import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

/** Drives the Matches table. */
export class MatchesDriver extends BaseDriver {
  protected readonly path = "/matches";

  row(ip: string) {
    return this.byTestId(`matches-row-${ip}`).first();
  }

  async search(query: string): Promise<void> {
    await this.byTestId("table-search").fill(query);
  }

  async expectRowVisible(ip: string): Promise<void> {
    await expect(this.row(ip)).toBeVisible({ timeout: 20_000 });
  }

  /** Expand a match row to reveal its raw log line. */
  async expandRow(ip: string): Promise<void> {
    await this.row(ip).click();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("matches-empty")).toBeVisible();
  }
}
