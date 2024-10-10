import {
  BanSchema,
  ConfigSchema,
  MatchSchema,
  UnbanSchema,
} from "@banalize/types";

export type Event = {
  type: "match" | "ban" | "unban";
  timestamp: number;
  ip: string;
  details: "stale" | "recent" | "active" | "expired" | "unbanned";
  line?: string;
};

type FormatEventArgs = {
  bans: BanSchema[];
  matches: MatchSchema[];
  unbans: UnbanSchema[];
  config: ConfigSchema;
};

export const getEvents = ({
  bans,
  matches,
  unbans,
  config,
}: FormatEventArgs): Event[] => {
  const events: Event[] = [
    ...mapMatchestoEvent(matches, config),
    ...mapBanstoEvent(bans),
    ...mapUnbanstoEvent(unbans),
  ];

  const sortedEvents = events.sort((a, b) => b.timestamp - a.timestamp);
  return sortedEvents;
};

const mapBanstoEvent = (bans: BanSchema[]): Event[] =>
  bans.map((ban) => {
    const isActive = ban.active;
    return {
      type: "ban",
      timestamp: ban.timestamp,
      ip: ban.ip,
      details: isActive ? "active" : "expired",
    };
  });

const mapMatchestoEvent = (
  matches: MatchSchema[],
  config: ConfigSchema,
): Event[] =>
  matches.map((match) => {
    const isRecent =
      match.timestamp > new Date().getTime() - config.findTime * 1000;
    return {
      type: "match",
      timestamp: match.timestamp,
      ip: match.ip,
      details: isRecent ? "recent" : "stale",
    };
  });

const mapUnbanstoEvent = (unbans: UnbanSchema[]): Event[] =>
  unbans.map((unban) => ({
    type: "unban",
    timestamp: unban.timestamp,
    ip: unban.ip,
    details: "unbanned",
  }));
