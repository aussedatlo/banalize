import { CoverageReport } from "monocart-coverage-reports";

/** Coverage collection is opt-in via COVERAGE=1 (see the test:coverage script). */
export const COVERAGE_ENABLED = ["1", "true"].includes(
  process.env.COVERAGE ?? "",
);

/**
 * Shared monocart options. Every process (test workers + global hooks) builds a
 * report with the same `name`/`outputDir`, so they share one on-disk cache:
 * workers `add()` raw V8 coverage, the global teardown `generate()`s the report.
 *
 * The UI is served as a production bundle with inline source maps (see
 * docker-compose.e2e.yml's BANALIZE_UI_SOURCEMAP build arg), which monocart uses
 * to map coverage back to the original `apps/ui/src` files.
 */
export const coverageOptions = {
  name: "Banalize UI E2E Coverage",
  outputDir: "./coverage",
  reports: ["html", "lcovonly", "console-summary"] as string[],
  // Keep only the app bundle (Caddy serves it under /assets/*.js).
  entryFilter: (entry: { url: string }): boolean =>
    entry.url.includes("/assets/") && entry.url.endsWith(".js"),
  // Keep the original UI sources (mapped paths look like ../../src/... or
  // src/...), drop third-party deps and bundler runtime.
  sourceFilter: (sourcePath: string): boolean =>
    sourcePath.includes("src/") && !sourcePath.includes("node_modules"),
};

export const createReport = (): CoverageReport =>
  new CoverageReport(coverageOptions);
