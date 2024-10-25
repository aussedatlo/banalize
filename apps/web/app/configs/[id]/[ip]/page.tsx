import { BanSchema, MatchSchema } from "@banalize/types";
import { Box, Grid, GridCol, Group } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { UnbanIpButton } from "components/configs/UnbanIpButton";
import { Paper } from "components/shared/Paper/Paper";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { Timeline, TimelineEvent } from "components/shared/Timeline/Timeline";
import { fetchBans, fetchConfigById, fetchMatches } from "lib/api";

function findFirstDate<T extends { timestamp: number }>(
  data: T[],
): Date | null {
  if (data.length === 0) return null;
  const earliestTimestamp = Math.min(...data.map((item) => item.timestamp));
  return new Date(earliestTimestamp);
}

// function findLastDate<T extends { timestamp: number }>(data: T[]): Date | null {
//   if (data.length === 0) return null;
//   const earliestTimestamp = Math.max(...data.map((item) => item.timestamp));
//   return new Date(earliestTimestamp);
// }

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
  console.log("banHistory:", bansHistory.totalCount);
  console.log("matchesHistory :", matchesHistory.totalCount);

  const firstMatch = findFirstDate(matchesHistory.matches);
  // const lastMatch = findLastDate(matchesHistory.matches);

  const firstBan = findFirstDate(bansHistory.bans);
  // const lastBan = findLastDate(bansHistory.bans);
  // check the first event date
  const firstEvent =
    firstMatch && firstBan
      ? new Date(Math.min(firstMatch.getTime(), firstBan.getTime()))
      : firstMatch || firstBan;
  console.log(firstEvent);

  const timelineEvents = generateTimelineEvents(
    matchesHistory.matches,
    bansHistory.bans,
    unbansHistory.bans,
  );
  console.log("timelineEvents:", timelineEvents);
  console.log(matchesHistory, bansHistory, unbansHistory);

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Group>
          <RouterBreadcrumbs path={`/configs/${configId}/${ip}`} />
        </Group>
        <Group>
          <UnbanIpButton config={config} ip={ip} />
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
