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
  time: string;
  ip: string;
  type: React.ReactNode;
  details: React.ReactNode;
  _timestamp: number;
  _type: string;
  _id: string;
  _line?: string;
};

const renderType = (
  type: string,
  icon: React.ReactElement,
  color: DefaultMantineColor,
): React.ReactNode => (
  <Box style={{ display: "flex", alignItems: "center" }}>
    <ThemeIcon color={color} size={rem(25)}>
      {icon}
    </ThemeIcon>
    <Text ml="xs" fz="sm">
      {type}
    </Text>
  </Box>
);

const renderBadge = (
  text: string,
  color: DefaultMantineColor,
): React.ReactNode => (
  <Badge color={color} size="md" variant="filled" style={{ display: "block" }}>
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
  const iconProps = { style: { width: rem(16), height: rem(16) } };

  matches.forEach((match) => {
    const isRecent =
      match.timestamp > new Date().getTime() - config.findTime * 1000;
    events.push({
      _timestamp: match.timestamp,
      time: new Date(match.timestamp).toLocaleString(),
      ip: match.ip,
      type: renderType("Match", <IconFlag {...iconProps} />, "dark"),
      details: isRecent
        ? renderBadge("recent", "cyan")
        : renderBadge("stale", "dark"),
      _type: "match",
      _id: match._id,
      _line: match.line,
    });
  });

  bans.forEach((ban) => {
    events.push({
      _timestamp: ban.timestamp,
      time: new Date(ban.timestamp).toLocaleString(),
      ip: ban.ip,
      type: renderType("Ban", <IconHandStop {...iconProps} />, "dark"),
      details: ban.active
        ? renderBadge("active", "pink")
        : renderBadge("expired", "dark"),
      _type: "ban",
      _id: ban._id,
    });
  });

  unbans.forEach((unban) => {
    events.push({
      _timestamp: unban.timestamp,
      time: new Date(unban.timestamp).toLocaleString(),
      ip: unban.ip,
      type: renderType("Unban", <IconHandOff {...iconProps} />, "dark"),
      details: renderBadge("unbanned", "dark"),
      _type: "unban",
      _id: unban._id,
    });
  });

  return events.sort((a, b) => b._timestamp - a._timestamp);
};
