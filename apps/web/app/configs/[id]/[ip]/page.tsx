import { BanSchema, MatchSchema } from "@banalize/types";
import { Box, Grid, GridCol, Group } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { BanUnbanIpButton } from "components/configs/BanUnbanIpButton";
import { Paper } from "components/shared/Paper/Paper";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { Timeline, TimelineEvent } from "components/shared/Timeline/Timeline";
import { fetchBans, fetchConfigById, fetchMatches } from "lib/api";

function generateTimelineEvents(
  matches: MatchSchema[],
  bans: BanSchema[],
  unbans: BanSchema[],
): TimelineEvent[] {
  const matchEvents = matches.map((match) => ({
    date: new Date(match.timestamp),
    type: "match" as const,
    event: match,
  }));

  const banEvents = bans.map((ban) => ({
    date: new Date(ban.timestamp),
    type: "ban" as const,
    event: ban,
  }));

  const unbanEvents = unbans.map((unban) => ({
    date: new Date(unban.timestamp),
    type: "unban" as const,
    event: unban,
  }));

  return [...matchEvents, ...banEvents, ...unbanEvents].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

export default async function TimelinePage({
  params,
}: {
  params: { id: string; ip: string };
}) {
  const configId = params.id;
  const config = await fetchConfigById(configId);

  const ip = params.ip;

  const bansHistory = await fetchBans({
    configId,
    ip: ip,
  });

  const matchesHistory = await fetchMatches({
    configId,
    ip: ip,
  });

  const unbansHistory = await fetchBans({
    configId,
    ip: ip,
    active: false,
  });

  const timelineEvents = generateTimelineEvents(
    matchesHistory.matches,
    bansHistory.bans,
    unbansHistory.bans,
  );

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Group>
          <RouterBreadcrumbs
            path={`/configs/${config._id}/${ip}`}
            displayedPath={`/configs/${config.name}/${ip}`}
          />
        </Group>
        <Group>
          <BanUnbanIpButton config={config} ip={ip} />
        </Group>
      </Group>

      <Grid>
        <GridCol span={12}>
          <Paper title="History" icon={<IconHistory />} h={"100%"}>
            {timelineEvents?.length > 0 ? (
              <Timeline events={timelineEvents} />
            ) : (
              <Group justify="space-between" w="100%">
                No events
              </Group>
            )}
          </Paper>
        </GridCol>
      </Grid>
    </Box>
  );
}
