import type { BanEvent, Config, UnbanEvent } from "@/lib/datasource";

export type BanStatus = "active" | "expired" | "unbanned";

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
 * Status of one ban event, mirroring the backend semantics: a ban ends when a
 * matching unban event lands at or after it (manual disable, config deletion,
 * or the cleaner expiring it) or when its ban_time elapses (shown as expired
 * even before the cleaner's next tick records the unban event).
 *
 * `bans` is the full ban list, needed to size escalated (recidive) bans.
 */
export function banStatus(
  ban: BanEvent,
  bans: BanEvent[],
  unbans: UnbanEvent[],
  configs: Map<string, Config>,
  now: number,
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

  if (scheduledEnd !== undefined && scheduledEnd <= now) return "expired";
  // Config gone and no unban event: nothing enforces this ban anymore.
  if (!config) return "expired";
  return "active";
}

/** Whether any config currently enforces a ban against this IP. */
export function isIpBanned(
  ip: string,
  bans: BanEvent[],
  unbans: UnbanEvent[],
  configs: Map<string, Config>,
  now: number,
): boolean {
  return bans.some(
    (b) => b.ip === ip && banStatus(b, bans, unbans, configs, now) === "active",
  );
}
