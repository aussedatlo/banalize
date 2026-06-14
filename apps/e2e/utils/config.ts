import path from "node:path";

/** Repo root (apps/e2e/utils -> apps/e2e -> apps -> root). */
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

/** Core API base URL (published by docker-compose.e2e.yml). */
export const CORE_URL = process.env.BANALIZE_E2E_CORE_URL ?? "http://localhost:6042";

/** UI base URL (Caddy, proxies /api to the core). */
export const UI_URL = process.env.BANALIZE_E2E_UI_URL ?? "http://localhost:6043";

/**
 * Host directory bind-mounted into the core at /var/log/banalize-e2e. Lines
 * appended here are tailed by the core's file watcher.
 */
export const LOG_DIR =
  process.env.BANALIZE_E2E_LOG_DIR ?? path.join(REPO_ROOT, "apps", "e2e", ".tmp", "logs");

/** Path of a watched log file as the core sees it inside the container. */
export const containerLogPath = (file: string): string => `/var/log/banalize-e2e/${file}`;
