import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

type Level = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";

/** Drives the live Logs page. */
export class LogsDriver extends BaseDriver {
  protected readonly path = "/logs";

  lines() {
    return this.byTestId("logs-line");
  }

  async search(query: string): Promise<void> {
    await this.byTestId("logs-search").fill(query);
  }

  async filterByLevel(level: Level | "All levels"): Promise<void> {
    await this.page.getByLabel("Filter by level").click();
    await this.page.getByRole("option", { name: level }).click();
  }

  async togglePause(): Promise<void> {
    await this.byTestId("logs-pause-toggle").click();
  }

  async clear(): Promise<void> {
    await this.byTestId("logs-clear").click();
  }

  /** Wait until at least one log line is streamed in. */
  async expectAnyLine(): Promise<void> {
    await expect(this.lines().first()).toBeVisible({ timeout: 20_000 });
  }

  async expectLineContaining(text: string): Promise<void> {
    await expect(this.lines().filter({ hasText: text }).first()).toBeVisible({
      timeout: 20_000,
    });
  }
}
