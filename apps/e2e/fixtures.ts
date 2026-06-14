import { test as base } from "@playwright/test";

import { ApiClient } from "./utils/api-client";
import { COVERAGE_ENABLED, createReport } from "./utils/coverage";
import { BansDriver } from "./utils/drivers/BansDriver";
import { ConfigDetailDriver } from "./utils/drivers/ConfigDetailDriver";
import { ConfigsDriver } from "./utils/drivers/ConfigsDriver";
import { DashboardDriver } from "./utils/drivers/DashboardDriver";
import { LogsDriver } from "./utils/drivers/LogsDriver";
import { MatchesDriver } from "./utils/drivers/MatchesDriver";
import { NotificationsDriver } from "./utils/drivers/NotificationsDriver";
import { OffendersDriver } from "./utils/drivers/OffendersDriver";
import { SidebarDriver } from "./utils/drivers/SidebarDriver";
import { LogInjector } from "./utils/log-injector";

type Fixtures = {
  api: ApiClient;
  logInjector: LogInjector;
  sidebar: SidebarDriver;
  dashboard: DashboardDriver;
  configs: ConfigsDriver;
  configDetail: ConfigDetailDriver;
  bans: BansDriver;
  matches: MatchesDriver;
  offenders: OffendersDriver;
  notifications: NotificationsDriver;
  logs: LogsDriver;
  /** Auto fixture: wipes all core state after every test so specs are isolated. */
  cleanup: void;
  /** Auto fixture: collects V8 JS coverage when COVERAGE=1. */
  collectCoverage: void;
};

/**
 * Playwright test extended with fixtures that inject ready-to-use drivers (one
 * per page) plus an out-of-band API client and a log injector. Fixtures are
 * lazy, so a test only provisions what it names.
 */
export const test = base.extend<Fixtures>({
  api: async ({}, use) => {
    await use(new ApiClient());
  },
  logInjector: async ({}, use) => {
    await use(new LogInjector());
  },
  sidebar: async ({ page }, use) => {
    await use(new SidebarDriver(page));
  },
  dashboard: async ({ page }, use) => {
    await use(new DashboardDriver(page));
  },
  configs: async ({ page }, use) => {
    await use(new ConfigsDriver(page));
  },
  configDetail: async ({ page }, use) => {
    await use(new ConfigDetailDriver(page));
  },
  bans: async ({ page }, use) => {
    await use(new BansDriver(page));
  },
  matches: async ({ page }, use) => {
    await use(new MatchesDriver(page));
  },
  offenders: async ({ page }, use) => {
    await use(new OffendersDriver(page));
  },
  notifications: async ({ page }, use) => {
    await use(new NotificationsDriver(page));
  },
  logs: async ({ page }, use) => {
    await use(new LogsDriver(page));
  },
  cleanup: [
    async ({ api }, use) => {
      await use();
      await api.reset();
    },
    { auto: true },
  ],
  collectCoverage: [
    async ({ page, browserName }, use) => {
      const on = COVERAGE_ENABLED && browserName === "chromium";
      // resetOnNavigation:false keeps coverage accumulating across the page
      // reloads each spec performs.
      if (on) await page.coverage.startJSCoverage({ resetOnNavigation: false });
      await use();
      if (on) {
        const entries = await page.coverage.stopJSCoverage();
        await createReport().add(entries);
      }
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
