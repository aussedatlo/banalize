import type {
  BanSchema,
  ConfigSchema,
  MatchSchema,
  UnbanSchema,
} from "@banalize/types";
import {
  Badge,
  Box,
  DefaultMantineColor,
  rem,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { IconFlag, IconHandOff, IconHandStop } from "@tabler/icons-react";

export type Event = {
  timestamp: number;
  time: string;
  ip: string;
  type: React.ReactNode;
  details: React.ReactNode;
};

const renderType = (
  type: string,
  icon: React.ReactElement,
  color: DefaultMantineColor,
): React.ReactNode => (
  <Box style={{ display: "flex", alignItems: "center" }}>
    <ThemeIcon color={color} size={rem(20)}>
      {icon}
    </ThemeIcon>
    <Text ml="xs">{type}</Text>
  </Box>
);

const renderBadge = (
  text: string,
  color: DefaultMantineColor,
): React.ReactNode => (
  <Badge color={color} size="md" variant="filled">
    {text}
  </Badge>
);

export const formatEvents = (
  matches: MatchSchema[],
  bans: BanSchema[],
  unbans: UnbanSchema[],
  config: ConfigSchema,
): Event[] => {
  const events: Event[] = [];

  matches.forEach((match) => {
    const isRecent =
      match.timestamp > new Date().getTime() - config.findTime * 1000;
    events.push({
      timestamp: match.timestamp,
      time: new Date(match.timestamp).toLocaleString(),
      ip: match.ip,
      type: renderType("Match", <IconFlag />, "dark"),
      details: isRecent
        ? renderBadge("recent", "yellow")
        : renderBadge("stale", "dark"),
    });
  });

  bans.forEach((ban) => {
    events.push({
      timestamp: ban.timestamp,
      time: new Date(ban.timestamp).toLocaleString(),
      ip: ban.ip,
      type: renderType("Ban", <IconHandStop />, "dark"),
      details: ban.active
        ? renderBadge("active", "red")
        : renderBadge("expired", "dark"),
    });
  });

  unbans.forEach((unban) => {
    events.push({
      timestamp: unban.timestamp,
      time: new Date(unban.timestamp).toLocaleString(),
      ip: unban.ip,
      type: renderType("Unban", <IconHandOff />, "dark"),
      details: renderBadge("unbanned", "dark"),
    });
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
};
