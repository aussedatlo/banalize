import { defineConfig, devices } from "@playwright/test";

import { UI_URL } from "./utils/config";

/**
 * Drives the real UI (served by Caddy) which proxies /api to the real core —
 * a full UI+core end-to-end stack brought up by start-servers.sh on the
 * dedicated test ports 6042 (core) / 6043 (UI).
 */
export default defineConfig({
  testDir: "./cases",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Specs share one core/DB and inject into shared log files, so run serially.
  workers: 1,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: UI_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "./start-servers.sh",
    // UI only starts once core is healthy (depends_on), so a single readiness
    // check on the UI implies the whole stack is up.
    url: UI_URL,
    reuseExistingServer: !process.env.CI,
    // The first run builds both Docker images, which can take a while.
    timeout: 300_000,
    // Give start-servers.sh's trap time to `docker compose down` the stack.
    gracefulShutdown: { signal: "SIGTERM", timeout: 30_000 },
    stdout: "pipe",
    stderr: "pipe",
  },
});
