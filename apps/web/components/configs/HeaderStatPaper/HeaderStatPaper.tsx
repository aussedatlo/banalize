import { Grid, Text } from "@mantine/core";
import { Paper } from "components/shared/Paper/ContainerPaper";
import { StatPaper } from "components/StatPaper/StatPaper";
import { Ban } from "types/Ban";
import { Config } from "types/Config";
import { Match } from "types/Match";

type HeaderStatPaperProps = {
  matches: Match[];
  bans: Ban[];
  config: Config;
};

export const HeaderStatPaper = ({
  matches,
  bans,
  config,
}: HeaderStatPaperProps) => {
  const timeToWatch = new Date().getTime() - config.findTime * 1000;
  const currentMatches = matches.filter(
    (match) => Number(match.timestamp) > timeToWatch,
  );
  const currentBans = bans.filter((ban) => Number(ban.timestamp) > timeToWatch);
  return (
    <Paper>
      <Text fz="h3">Statistics</Text>
      <Grid mt="xl">
        <Grid.Col span={{ base: 12, xs: 3 }}>
          <StatPaper stat={{ label: "matches", value: matches.length }} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 3 }}>
          <StatPaper
            stat={{ label: "Current matches", value: currentMatches.length }}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 3 }}>
          <StatPaper stat={{ label: "bans", value: bans.length }} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, xs: 3 }}>
          <StatPaper
            stat={{ label: "Current bans", value: currentBans.length }}
          />
        </Grid.Col>
      </Grid>
    </Paper>
  );
};
