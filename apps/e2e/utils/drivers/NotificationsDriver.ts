import { expect, type Locator } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

export type NotifierEvent = "ban" | "unban" | "match";

export interface EmailNotifierInput {
  recipient: string;
  server: string;
  port?: number;
  username?: string;
  password?: string;
  events?: NotifierEvent[];
}

export interface SignalNotifierInput {
  server: string;
  number: string;
  recipients: string;
  events?: NotifierEvent[];
}

/**
 * Drives the Notifications page. Notifier ids are backend-assigned UUIDs, so
 * cards are located by their (unique) recipient/server text rather than by id.
 */
export class NotificationsDriver extends BaseDriver {
  protected readonly path = "/notifications";

  /** The card whose visible text contains `text` (e.g. a recipient address). */
  card(text: string): Locator {
    return this.page.locator('[data-testid^="notifier-card-"]').filter({ hasText: text });
  }

  async openCreateDialog(): Promise<void> {
    await this.byTestId("notifier-create-button").click();
    await expect(this.byTestId("notifier-form")).toBeVisible();
  }

  /** Make the form's selected events exactly equal `events`. */
  private async setEvents(events: NotifierEvent[]): Promise<void> {
    for (const event of ["ban", "unban", "match"] as NotifierEvent[]) {
      const button = this.byTestId(`notifier-event-${event}`);
      const pressed = (await button.getAttribute("aria-pressed")) === "true";
      const want = events.includes(event);
      if (pressed !== want) await button.click();
    }
  }

  private async selectChannel(kind: "email" | "signal"): Promise<void> {
    await this.page.getByLabel("Channel").click();
    await this.page.getByRole("option", { name: kind === "email" ? "Email (SMTP)" : "Signal" }).click();
  }

  async createEmailNotifier(input: EmailNotifierInput): Promise<void> {
    await this.openCreateDialog();
    await this.setEvents(input.events ?? ["ban"]);
    await this.selectChannel("email");
    await this.page.locator("#email-server").fill(input.server);
    if (input.port !== undefined) await this.page.locator("#email-port").fill(String(input.port));
    if (input.username) await this.page.locator("#email-username").fill(input.username);
    if (input.password) await this.page.locator("#email-password").fill(input.password);
    await this.page.locator("#email-recipient").fill(input.recipient);
    await this.byTestId("notifier-form-submit").click();
    await expect(this.byTestId("notifier-form")).toBeHidden();
    await expect(this.card(input.recipient)).toBeVisible();
  }

  async createSignalNotifier(input: SignalNotifierInput): Promise<void> {
    await this.openCreateDialog();
    await this.setEvents(input.events ?? ["ban"]);
    await this.selectChannel("signal");
    await this.page.locator("#signal-server").fill(input.server);
    await this.page.locator("#signal-number").fill(input.number);
    await this.page.locator("#signal-recipients").fill(input.recipients);
    await this.byTestId("notifier-form-submit").click();
    await expect(this.byTestId("notifier-form")).toBeHidden();
    await expect(this.card(input.server)).toBeVisible();
  }

  async deleteNotifier(text: string): Promise<void> {
    const card = this.card(text);
    await card.locator('[data-testid^="notifier-delete-"]').click();
    await expect(card).toBeHidden();
  }

  async testNotifier(text: string): Promise<void> {
    await this.card(text).locator('[data-testid^="notifier-test-"]').first().click();
  }

  /** The test-result message inside a card (success or failure). */
  testResult(text: string): Locator {
    return this.card(text).locator('[data-testid^="notifier-test-result-"]');
  }

  async expectNotifierVisible(text: string): Promise<void> {
    await expect(this.card(text)).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("notifiers-empty")).toBeVisible();
  }
}
