import { Paper, Text } from "@mantine/core";
import { CustomTable } from "components/shared/CustomTable/CustomTable";
import { formatDistance } from "date-fns";
import { Ban } from "types/Ban";
import { Match } from "types/Match";
import classes from "./EventsTablePaper.module.css";

type EventsTablePaperProps = {
  matches: Match[];
  bans: Ban[];
};

export const EventsTablePaper = ({ matches, bans }: EventsTablePaperProps) => {
  const matchItems = matches.map((match: Match) => ({
    date: formatDistance(new Date(match.timestamp), new Date(), {
      addSuffix: true,
    }),
    _id: match._id,
    timestamp: match.timestamp,
    type: "Match",
    ip: match.ip,
  }));
  const banItems = bans.map((ban: Ban) => ({
    date: formatDistance(new Date(ban.timestamp), new Date(), {
      addSuffix: true,
    }),
    _id: ban._id,
    timestamp: ban.timestamp,
    type: "Ban",
    ip: ban.ip,
  }));

  const items = [...matchItems, ...banItems].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  return (
    <Paper className={classes.root} mt="xl">
      <Text fz="h3" mb="xl">
        Events
      </Text>
      <CustomTable items={items} headers={["date", "ip", "type"]} />
    </Paper>
  );
};
