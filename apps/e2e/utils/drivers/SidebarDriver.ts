import { expect, type Page } from "@playwright/test";

export type Route =
  | "dashboard"
  | "configs"
  | "bans"
  | "matches"
  | "offenders"
  | "notifications"
  | "logs";

/** Drives the left navigation sidebar. */
export class SidebarDriver {
  constructor(private readonly page: Page) {}

  link(route: Route) {
    return this.page.getByTestId(`nav-link-${route}`);
  }

  /** Click a nav link and wait for the route to load. */
  async navigateTo(route: Route): Promise<void> {
    await this.link(route).click();
    await this.page.waitForURL(`**/${route}`);
  }

  /** Assert the given route's link is the active (current) one (brand gradient). */
  async expectActive(route: Route): Promise<void> {
    await expect(this.link(route)).toHaveClass(/from-brand-blue/);
  }
}
