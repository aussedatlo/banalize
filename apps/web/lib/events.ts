import { formatDistance } from "date-fns";
import { Ban } from "types/Ban";
import { Match } from "types/Match";

type EventTypes = "match" | "ban";
type Event = {
  timestamp: number;
  time: string;
  ip: string;
  type: EventTypes;
  line: string;
};

export const formatEvents = (matches: Match[], bans: Ban[]): Event[] => {
  const events: Event[] = [];

  matches.forEach((match) => {
    events.push({
      timestamp: match.timestamp,
      time: formatDistance(new Date(match.timestamp), new Date(), {
        addSuffix: true,
      }),
      ip: match.ip,
      type: "match",
      line: match.line,
    });
  });

  bans.forEach((ban) => {
    events.push({
      timestamp: ban.timestamp,
      time: formatDistance(new Date(ban.timestamp), new Date(), {
        addSuffix: true,
      }),
      ip: ban.ip,
      type: "ban",
      line: "",
    });
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
};
