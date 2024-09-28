import { BanSchema, MatchSchema } from "@banalize/api";
import { Box, Grid, GridCol, Group } from "@mantine/core";
import { IconHistory } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import {
  fetchBansByConfigIdAndIp,
  fetchMatchesByConfigIdAndIp,
  fetchUnbansByConfigIdAndIp,
} from "lib/api";
import {
  Timeline,
  TimelineEvent,
} from "../../../../../components/shared/Timeline/Timeline";

function findFirstDate<T extends { timestamp: number }>(
  data: T[],
): Date | null {
  if (data.length === 0) return null;
  const earliestTimestamp = Math.min(...data.map((item) => item.timestamp));
  return new Date(earliestTimestamp);
}

function findLastDate<T extends { timestamp: number }>(data: T[]): Date | null {
  if (data.length === 0) return null;
  const earliestTimestamp = Math.max(...data.map((item) => item.timestamp));
  return new Date(earliestTimestamp);
}

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
  const ip = params.ip;

  const bansHistory = await fetchBansByConfigIdAndIp(configId, ip);
  const matchesHistory = await fetchMatchesByConfigIdAndIp(configId, ip);
  const unbansHistory = await fetchUnbansByConfigIdAndIp(configId, ip);
  console.log("banHistory:", bansHistory.length);
  console.log("matchesHistory :", matchesHistory.length);

  const firstMatch = findFirstDate(matchesHistory);
  const lastMatch = findLastDate(matchesHistory);

  const firstBan = findFirstDate(bansHistory);
  const lastBan = findLastDate(bansHistory);
  // check the first event date
  const firstEvent =
    firstMatch && firstBan
      ? new Date(Math.min(firstMatch.getTime(), firstBan.getTime()))
      : firstMatch || firstBan;
  console.log(firstEvent);

  const timelineEvents = generateTimelineEvents(
    matchesHistory,
    bansHistory,
    unbansHistory,
  );
  console.log("timelineEvents:", timelineEvents);

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
        <RouterBreadcrumbs path={`/configs/${configId}/ip/${ip}`} />
      </Group>

      <Grid>
        <GridCol span={12}>
          <Paper title="History" icon={<IconHistory />} h={265}>
            {/*{timelineEvents.map((event, index) => (*/}
            {/*  <Group justify="space-between" w="100%" key={`${index}-stat`}>*/}
            {/*    {event.type}:{event.date.toDateString()}*/}
            {/*  </Group>*/}
            {/*))}*/}
            {/* display the first event date */}

            {timelineEvents?.length > 0 ? (
              // <Group>
              //   <EventComponent
              //     timelineEvent={timelineEvents[0]}
              //     type={timelineEvents[0].type}
              //   />
              // </Group>
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
