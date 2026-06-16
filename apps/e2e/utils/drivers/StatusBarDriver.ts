import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

/** Drives the bottom status bar (versions + backend health dot). */
export class StatusBarDriver extends BaseDriver {
  // The bar is global; any page renders it. Dashboard is the default landing.
  protected readonly path = "/dashboard";

  async expectUiVersion(version: string | RegExp): Promise<void> {
    await expect(this.byTestId("status-bar-ui-version")).toContainText(version);
  }

  async expectCoreVersion(version: string): Promise<void> {
    await expect(this.byTestId("status-bar-core-version")).toContainText(
      version,
    );
  }

  /** Assert the health dot reports the backend as online. */
  async expectOnline(): Promise<void> {
    await expect(this.byTestId("status-bar-dot")).toHaveAttribute(
      "data-status",
      "online",
    );
  }
}
