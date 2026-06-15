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

  async openEdit(): Promise<void> {
    await this.byTestId("config-detail-edit").click();
    await expect(this.byTestId("config-form")).toBeVisible();
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
