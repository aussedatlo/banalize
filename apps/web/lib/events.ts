import { BanSchema, MatchSchema, UnbanSchema } from "@banalize/api";
import { formatDistance } from "date-fns";

type EventTypes = "match" | "ban" | "unban";
type Event = {
  timestamp: number;
  time: string;
  ip: string;
  type: EventTypes;
  line: string;
};

export const formatEvents = (
  matches: MatchSchema[],
  bans: BanSchema[],
  unbans: UnbanSchema[],
): Event[] => {
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

  unbans.forEach((unban) => {
    events.push({
      timestamp: unban.timestamp,
      time: formatDistance(new Date(unban.timestamp), new Date(), {
        addSuffix: true,
      }),
      ip: unban.ip,
      type: "unban",
      line: "",
    });
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
};
