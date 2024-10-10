import {
  BanSchema,
  ConfigSchema,
  MatchSchema,
  UnbanSchema,
} from "@banalize/types";

export type Event = {
  type: "match" | "ban" | "unban";
  timestamp: number;
  details: "stale" | "recent" | "active" | "expired" | "unbanned";
  event: BanSchema | MatchSchema | UnbanSchema;
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
      details: isActive ? "active" : "expired",
      event: ban,
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
      details: isRecent ? "recent" : "stale",
      event: match,
    };
  });

const mapUnbanstoEvent = (unbans: UnbanSchema[]): Event[] =>
  unbans.map((unban) => ({
    type: "unban",
    timestamp: unban.timestamp,
    details: "unbanned",
    event: unban,
  }));
