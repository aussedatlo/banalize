# @banalize/e2e

Playwright end-to-end tests that drive the **real UI** (served by Caddy) against
the **real core**, brought up as an isolated Docker stack on dedicated test
ports (core `6042`, UI `6043`).

## Architecture

Modeled on a driver-per-page + fixtures layout:

```
playwright.config.ts     # webServer runs start-servers.sh; baseURL = UI (6043)
start-servers.sh         # docker compose up the e2e stack; tears it down on exit
fixtures.ts              # test.extend: lazy driver/api/logInjector fixtures + auto cleanup
utils/
  config.ts              # URLs, log dir, container paths
  api-client.ts          # seed/teardown core state out-of-band of the UI
  log-injector.ts        # append lines to the watched log dir (bind-mounted into core)
  utils.ts               # small helpers (sleep, timings, unique ids)
  drivers/               # one driver per page (Sidebar, Configs, Bans, ...)
cases/<feature>/*.spec.ts
```

Each driver takes the Playwright `page`, exposes `goto()` + actions + `expect…`
assertions, and is injected via a lazy fixture. The `cleanup` fixture wipes all
core state after every test.

The Docker stack is defined in `../../docker-compose.e2e.yml`. The core's watched
log directory is bind-mounted from `.tmp/logs`, so `LogInjector` (running on the
host) can write lines that the core's file watcher tails.

## Running

```bash
pnpm install
pnpm --filter=@banalize/e2e install:browsers   # one-time
pnpm e2e test            # builds images, starts the stack, runs specs, tears down
pnpm e2e test:headed     # watch it run
pnpm e2e test:report     # open the last HTML report
```

Requires Docker (with `docker compose`). Set `BANALIZE_E2E_CORE_URL` /
`BANALIZE_E2E_UI_URL` / `BANALIZE_E2E_LOG_DIR` to point at an externally managed
stack instead of the bundled compose file.

## Coverage

```bash
pnpm e2e:coverage        # COVERAGE=1 playwright test
open apps/e2e/coverage/index.html
```

UI **frontend** coverage is collected via Chromium's V8 JS coverage and mapped
back to `apps/ui/src` with [monocart-coverage-reports]. For the mapping to work
the e2e UI image is built with **inline source maps** (the
`BANALIZE_UI_SOURCEMAP=true` build arg in `docker-compose.e2e.yml`, gated in
`apps/ui/vite.config.ts`; production builds stay map-free).

How it is wired (`utils/coverage.ts`):

- `playwright.config.ts` `globalSetup` clears stale raw coverage; `globalTeardown`
  merges it and writes the report (only when `COVERAGE=1`).
- The auto `collectCoverage` fixture (`fixtures.ts`) starts/stops
  `page.coverage` per test and `add()`s the raw V8 data; workers and the global
  hooks share one on-disk cache via the same monocart `name`/`outputDir`.

Reports (`html`, `lcovonly`, `console-summary`) land in `apps/e2e/coverage/`.

[monocart-coverage-reports]: https://github.com/cenfun/monocart-coverage-reports
