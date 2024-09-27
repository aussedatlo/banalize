import { BanSchema, MatchSchema, UnbanSchema } from "@banalize/api";
import { Box, DefaultMantineColor, rem, Text, ThemeIcon } from "@mantine/core";
import { IconFlag, IconHandOff, IconHandStop } from "@tabler/icons-react";
import { TruncatedText } from "components/shared/Text/TruncatedText";
import { formatDistance } from "date-fns";

type Event = {
  timestamp: number;
  time: string;
  ip: string;
  type: React.ReactNode;
  line: string | React.ReactElement;
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
      type: renderType("Match", <IconFlag />, "yellow"),
      line: <TruncatedText>{match.line}</TruncatedText>,
    });
  });

  bans.forEach((ban) => {
    events.push({
      timestamp: ban.timestamp,
      time: formatDistance(new Date(ban.timestamp), new Date(), {
        addSuffix: true,
      }),
      ip: ban.ip,
      type: renderType("Ban", <IconHandStop />, "red"),
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
      type: renderType("Unban", <IconHandOff />, "green"),
      line: "",
    });
  });

  return events.sort((a, b) => b.timestamp - a.timestamp);
};
