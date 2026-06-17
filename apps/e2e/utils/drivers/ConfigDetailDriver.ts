import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

/** Drives a single config's detail page (scoped dashboard + events + live log). */
export class ConfigDetailDriver extends BaseDriver {
  protected readonly path = "/configs";

  async gotoConfig(id: string): Promise<void> {
    await this.page.goto(`/configs/${id}`, { waitUntil: "domcontentloaded" });
  }

  async expectName(name: string): Promise<void> {
    await expect(this.byTestId("config-detail-name")).toHaveText(name);
  }

  /** Assert the summary shows the recidive multiplier (only rendered when > 1). */
  async expectRecidiveMultiplier(value: number): Promise<void> {
    await expect(this.byTestId("config-detail-recidive")).toHaveText(
      `×${value} on repeat`,
    );
  }

  async openEdit(): Promise<void> {
    await this.byTestId("config-detail-edit").click();
    await expect(this.byTestId("config-form")).toBeVisible();
  }

  /** Submit the edit form and wait for it to close. */
  private async saveEdit(): Promise<void> {
    await this.byTestId("config-form-submit").click();
    await expect(this.byTestId("config-form")).toBeHidden();
  }

  /** Open the edit form, change the display name, and save (id is immutable). */
  async editName(name: string): Promise<void> {
    await this.openEdit();
    await this.page.locator("#name").fill(name);
    await this.saveEdit();
  }

  /** Open the edit form, change the match threshold, and save. */
  async editMaxMatches(value: number): Promise<void> {
    await this.openEdit();
    await this.page.locator("#max_matches").fill(String(value));
    await this.saveEdit();
  }

  /** Open the live log modal (the tail streams only while it is open). */
  async openLiveLog(): Promise<void> {
    await this.byTestId("config-detail-live-log").click();
  }

  /** Wait for at least one line to appear in the live log tail (open it first). */
  async expectLiveLogLine(text: string): Promise<void> {
    await expect(
      this.byTestId("live-log-line").filter({ hasText: text }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  }
}
