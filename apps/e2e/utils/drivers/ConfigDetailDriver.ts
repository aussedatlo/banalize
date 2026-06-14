import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

/** Drives a single config's detail page (scoped dashboard + live log tail). */
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

  /** Wait for at least one line to appear in the live log tail. */
  async expectLiveLogLine(text: string): Promise<void> {
    await expect(
      this.byTestId("live-log-line").filter({ hasText: text }).first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  }
}
