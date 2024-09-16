import { Grid, GridCol, Text } from "@mantine/core";
import { IconChartArcs } from "@tabler/icons-react";
import { Card } from "components/shared/Card/Card";
import { Paper } from "components/shared/Paper/Paper";
import { Ban } from "types/Ban";
import { Match } from "types/Match";
import classes from "./ConfigStatsPaper.module.css";

type StatCardProps = {
  text: string;
  value: string;
};

const StatCard = ({ text, value }: StatCardProps) => {
  return (
    <Card>
      <Text className={classes.value} fz="h1" mt="xs">
        {value}
      </Text>
      <Text className={classes.text} mb="xs">
        {text}
      </Text>
    </Card>
  );
};

type ConfigStatsPaperProps = {
  matches: Match[];
  bans: Ban[];
  activeMatches: Match[];
  activeBans: Ban[];
};

export const ConfigStatsPaper = ({
  matches,
  bans,
  activeMatches,
  activeBans,
}: ConfigStatsPaperProps) => {
  const items: StatCardProps[] = [
    { text: "Total matches", value: matches.length.toString() },
    { text: "Total bans", value: bans.length.toString() },
    { text: "Active matches", value: activeMatches.length.toString() },
    { text: "Active bans", value: activeBans.length.toString() },
  ];

  return (
    <Paper title="Statistics" icon={<IconChartArcs />} h={250}>
      <Grid w="100%">
        {items.map((item, index) => (
          <GridCol span={{ base: 12, xs: 3 }} key={`${index}-stat`}>
            <StatCard {...item} />
          </GridCol>
        ))}
      </Grid>
    </Paper>
  );
};
