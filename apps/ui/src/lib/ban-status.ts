import type { BanEvent, Config, UnbanEvent } from "@/lib/datasource";

export type BanStatus = "active" | "expired" | "unbanned";

/**
 * Status of one ban event, mirroring the backend semantics: a ban ends when a
 * matching unban event lands at or after it (manual disable, config deletion,
 * or the cleaner expiring it) or when its ban_time elapses (shown as expired
 * even before the cleaner's next tick records the unban event).
 */
export function banStatus(
  ban: BanEvent,
  unbans: UnbanEvent[],
  configs: Map<string, Config>,
  now: number,
): BanStatus {
  const config = configs.get(ban.config_id);
  const scheduledEnd = config ? ban.timestamp + config.ban_time : undefined;

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
    (b) => b.ip === ip && banStatus(b, unbans, configs, now) === "active",
  );
}
