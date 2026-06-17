import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

export type BanStatus = "active" | "expired" | "unbanned";

/** Drives ban rows on the merged Events table. */
export class BansDriver extends BaseDriver {
  protected readonly path = "/events";

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

  /** Narrow the merged table to one event kind via the type Select. */
  async filterByType(type: "all" | "match" | "ban" | "unban"): Promise<void> {
    const label = {
      all: "All events",
      match: "Matches",
      ban: "Bans",
      unban: "Unbans",
    }[type];
    await this.page.getByLabel("Filter by type").click();
    await this.page.getByRole("option", { name: label, exact: true }).click();
  }

  /** The unban event row for `ip` (its own row on the merged timeline). */
  async expectUnbanRowVisible(ip: string): Promise<void> {
    await expect(this.byTestId(`unbans-row-${ip}`)).toBeVisible({
      timeout: 20_000,
    });
  }

  async expectNoUnbanRow(ip: string): Promise<void> {
    await expect(this.byTestId(`unbans-row-${ip}`)).toHaveCount(0);
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

  async expectNoRow(ip: string): Promise<void> {
    await expect(this.row(ip)).toHaveCount(0);
  }

  async unban(ip: string): Promise<void> {
    await this.byTestId(`bans-unban-${ip}`).click();
  }

  /**
   * The active ban row for `ip`. A recidive offender has several ban rows for
   * the same IP, so we narrow to the one whose status badge reads "active".
   */
  private activeRow(ip: string) {
    return this.row(ip).filter({
      has: this.byTestId(`bans-status-${ip}`).filter({ hasText: "active" }),
    });
  }

  async expectActiveRowVisible(ip: string): Promise<void> {
    await expect(this.activeRow(ip)).toBeVisible({ timeout: 20_000 });
  }

  /**
   * Seconds remaining on `ip`'s active ban, read from its "Xs left" countdown
   * (`formatDuration` renders a single coarse unit: s/m/h/d).
   */
  async activeRemainingSeconds(ip: string): Promise<number> {
    const text = await this.activeRow(ip).getByText(/left$/).innerText();
    const match = text.match(/(\d+)\s*([smhd])/);
    if (!match) throw new Error(`unexpected remaining text: "${text}"`);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]] ?? 1;
    return Number(match[1]) * unit;
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("events-empty")).toBeVisible();
  }

  /**
   * The event kind of every row for `ip`, in the order they appear in the
   * merged timeline (top first). Lets a spec assert the relative ordering of an
   * IP's match / ban / unban rows — every kind's row testid ends in `-row-<ip>`.
   */
  async rowKindsInOrder(ip: string): Promise<Array<"match" | "ban" | "unban">> {
    const ids = await this.page
      .locator(`tbody tr[data-testid$="-row-${ip}"]`)
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-testid") ?? ""),
      );
    return ids.map((id) => {
      if (id.startsWith("matches-row-")) return "match";
      if (id.startsWith("unbans-row-")) return "unban";
      return "ban";
    });
  }
}
