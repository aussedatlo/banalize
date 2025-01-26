import { BanSchema, EventType, MatchSchema } from "@banalize/types";
import { Box, Grid, GridCol, Group } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { BanUnbanIpButton } from "components/configs/BanUnbanIpButton";
import { ConfigEventsPaper } from "components/configs/ConfigEventsPaper";
import { Paper } from "components/shared/Paper/Paper";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { Timeline, TimelineEvent } from "components/shared/Timeline/Timeline";
import {
  fetchBans,
  fetchConfigById,
  fetchEvents,
  fetchIpInfos,
  fetchMatches,
} from "lib/api";

function generateTimelineEvents(
  matches: MatchSchema[],
  bans: BanSchema[],
  unbans: BanSchema[],
): TimelineEvent[] {
  const matchEvents = matches.map((match) => ({
    date: new Date(match.timestamp),
    type: EventType.MATCH,
    event: match,
  }));

  const banEvents = bans.map((ban) => ({
    date: new Date(ban.timestamp),
    type: EventType.BAN,
    event: ban,
  }));

  const unbanEvents = unbans.map((unban) => ({
    date: new Date(unban.timestamp),
    type: EventType.UNBAN,
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
  const { id: configId, ip } = params;
  const config = await fetchConfigById(configId);
  const { data: events, totalCount: totalEventsCount } = await fetchEvents({
    configId,
    ip,
  });
  const ipList = Array.from(new Set(events.map((event) => event.ip)));
  const IpInfos = await fetchIpInfos({ ips: ipList });

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

        <GridCol span={12}>
          <ConfigEventsPaper
            events={events}
            totalCount={totalEventsCount}
            config={config}
            ipInfos={IpInfos}
            ipFilter={ip}
          />
        </GridCol>
      </Grid>
    </Box>
  );
}
