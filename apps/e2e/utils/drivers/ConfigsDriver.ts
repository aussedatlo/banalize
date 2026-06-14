import { expect } from "@playwright/test";

import { BaseDriver } from "./BaseDriver";

export interface ConfigFormInput {
  name: string;
  param: string;
  regex: string;
  maxMatches?: number;
}

/** Mirrors the UI's slugify so tests can predict a config's id from its name. */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/, "");
}

/** Drives the Configs list page and its create/edit dialog. */
export class ConfigsDriver extends BaseDriver {
  protected readonly path = "/configs";

  card(id: string) {
    return this.byTestId(`config-card-${id}`);
  }

  async openCreateDialog(): Promise<void> {
    await this.byTestId("config-create-button").click();
    await expect(this.byTestId("config-form")).toBeVisible();
  }

  /** Fill the (already open) config form. */
  async fillForm(input: ConfigFormInput): Promise<void> {
    await this.page.locator("#name").fill(input.name);
    await this.page.locator("#param").fill(input.param);
    await this.page.locator("#regex").fill(input.regex);
    if (input.maxMatches !== undefined) {
      await this.page.locator("#max_matches").fill(String(input.maxMatches));
    }
  }

  async submitForm(): Promise<void> {
    await this.byTestId("config-form-submit").click();
    await expect(this.byTestId("config-form")).toBeHidden();
  }

  /** Open the dialog, fill it, submit, and wait for the new card to appear. */
  async createConfig(input: ConfigFormInput): Promise<string> {
    await this.openCreateDialog();
    await this.fillForm(input);
    await this.submitForm();
    const id = slugify(input.name);
    await expect(this.card(id)).toBeVisible();
    return id;
  }

  async deleteConfig(id: string): Promise<void> {
    await this.byTestId(`config-delete-${id}`).click();
    await expect(this.card(id)).toBeHidden();
  }

  async openConfig(id: string): Promise<void> {
    await this.card(id).click();
    await this.page.waitForURL(`**/configs/${id}`);
  }

  async expectConfigVisible(id: string): Promise<void> {
    await expect(this.card(id)).toBeVisible();
  }

  async expectEmpty(): Promise<void> {
    await expect(this.byTestId("configs-empty")).toBeVisible();
  }
}
