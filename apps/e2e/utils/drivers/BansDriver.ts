import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

export type BanStatus = "active" | "expired" | "unbanned";

/** Drives the Bans table. */
export class BansDriver extends BaseDriver {
  protected readonly path = "/bans";

  row(ip: string) {
    return this.byTestId(`bans-row-${ip}`);
  }

  async search(query: string): Promise<void> {
    await this.byTestId("table-search").fill(query);
  }

  async filterByConfig(name: string): Promise<void> {
    await this.page.getByLabel("Filter by config").click();
    await this.page.getByRole("option", { name }).click();
  }

  /** Wait for a ban row to show the expected status (polls; bans arrive async). */
  async expectStatus(ip: string, status: BanStatus): Promise<void> {
    await expect(this.byTestId(`bans-status-${ip}`)).toHaveText(status, {
      timeout: 20_000,
    });
  }

  async expectRowVisible(ip: string): Promise<void> {
    await expect(this.row(ip)).toBeVisible({ timeout: 20_000 });
  }

  async unban(ip: string): Promise<void> {
    await this.byTestId(`bans-unban-${ip}`).click();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("bans-empty")).toBeVisible();
  }
}
