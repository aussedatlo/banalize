/** A unique-ish id suffix so parallel-safe specs don't collide on names/ids. */
export const uniqueSuffix = (): string =>
  Math.random().toString(36).slice(2, 8);

/**
 * A random IP in the 198.18.0.0/15 benchmark range (RFC 2544) — ~131k
 * addresses, so parallel specs effectively never collide. Unique IPs keep specs
 * isolated on the merged Events table, which searches by IP across all configs.
 * (These addresses have no geoip country, so no flag renders for them.)
 */
export const randomIp = (): string =>
  `198.${18 + Math.floor(Math.random() * 2)}.${Math.floor(
    Math.random() * 256,
  )}.${1 + Math.floor(Math.random() * 254)}`;

/** Common ban-rule timings for the lifecycle spec (milliseconds). */
export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Grace period after creating a config before injecting log lines: the core
 * spawns its file tailer asynchronously and seeks to EOF, so lines written too
 * early (before the tailer is watching) would be skipped.
 */
export const WATCHER_WARMUP_MS = 2500;
