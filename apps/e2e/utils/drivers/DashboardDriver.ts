import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

/** Drives the overview Dashboard (stat cards + activity chart). */
export class DashboardDriver extends BaseDriver {
  protected readonly path = "/dashboard";

  bansValue() {
    return this.byTestId("stat-bans-value");
  }

  matchesValue() {
    return this.byTestId("stat-matches-value");
  }

  unbansValue() {
    return this.byTestId("stat-unbans-value");
  }

  async expectBanCountAtLeast(min: number): Promise<void> {
    await expect
      .poll(async () => Number((await this.bansValue().textContent()) ?? "0"), {
        timeout: 20_000,
      })
      .toBeGreaterThanOrEqual(min);
  }

  async expectVisible(): Promise<void> {
    await expect(this.bansValue()).toBeVisible();
  }
}
