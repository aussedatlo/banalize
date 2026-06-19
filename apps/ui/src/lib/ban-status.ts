import type { BanEvent, Config, UnbanEvent } from "@/lib/datasource";

export type BanStatus = "active" | "expired" | "unbanned";

export type MatchStatus = "counting" | "expired";

/**
 * Whether a match still counts toward triggering a ban. The backend bans an IP
 * once `max_matches` of its matches fall within the trailing `find_time` window
 * (see detector.rs); once a match ages past that window it no longer counts.
 * With the config gone there is nothing left to count it for, so it's expired.
 */
export function matchStatus(
  matchTimestamp: number,
  config: Config | undefined,
  now: number,
): MatchStatus {
  if (!config) return "expired";
  return matchTimestamp + config.find_time > now ? "counting" : "expired";
}

/**
 * Effective duration of a single ban, mirroring the backend: with the recidive
 * multiplicator set, the same (config, IP) escalates as
 * `ban_time * multiplicator^prior_bans`, where `prior_bans` is how many earlier
 * bans of that IP exist. Without it, the flat `ban_time` applies.
 */
export function effectiveBanTime(
  ban: BanEvent,
  bans: BanEvent[],
  config: Config,
): number {
  const mult = config.recidive_multiplicator;
  if (!mult || mult <= 1) return config.ban_time;
  // Count bans of this (config, IP) up to and including this one; the n-th ban
  // used exponent n-1 (the same 0-based count the backend escalates on).
  const n = bans.filter(
    (b) =>
      b.config_id === ban.config_id &&
      b.ip === ban.ip &&
      b.timestamp <= ban.timestamp,
  ).length;
  return config.ban_time * Math.pow(mult, Math.max(0, n - 1));
}

/**
 * Status of one ban event, mirroring the backend semantics: a ban is enforced
 * until the backend records a matching unban event (manual disable, config
 * deletion, or the cleaner expiring it). Crucially, the UI does *not* declare a
 * ban expired on its own once the config's ban_time elapses: a ban keeps the
 * effective duration it was issued with, which the backend froze at creation,
 * so a later edit to the config's ban_time must not retroactively "expire" a
 * still-enforced ban here. Only the unban event ends a ban.
 *
 * `bans` is the full ban list, needed to size escalated (recidive) bans.
 */
export function banStatus(
  ban: BanEvent,
  bans: BanEvent[],
  unbans: UnbanEvent[],
  configs: Map<string, Config>,
): BanStatus {
  const config = configs.get(ban.config_id);
  const scheduledEnd = config
    ? ban.timestamp + effectiveBanTime(ban, bans, config)
    : undefined;

  const unban = unbans.find(
    (u) =>
      u.config_id === ban.config_id &&
      u.ip === ban.ip &&
      u.timestamp >= ban.timestamp,
  );
  if (unban) {
    // An unban at (or past) the scheduled end was the cleaner expiring the
    // ban; anything earlier was lifted deliberately. 2s of slack covers the
    // cleaner tick landing just before the exact boundary.
    if (scheduledEnd !== undefined && unban.timestamp >= scheduledEnd - 2000) {
      return "expired";
    }
    return "unbanned";
  }

  // Config gone but no unban yet: deletion lifts every ban and emits an unban
  // (see api/configs.rs), so this only covers the brief load race before that
  // unban arrives — nothing enforces the ban anymore.
  if (!config) return "expired";
  return "active";
}

/** Whether any config currently enforces a ban against this IP. */
export function isIpBanned(
  ip: string,
  bans: BanEvent[],
  unbans: UnbanEvent[],
  configs: Map<string, Config>,
): boolean {
  return bans.some(
    (b) => b.ip === ip && banStatus(b, bans, unbans, configs) === "active",
  );
}
