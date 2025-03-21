export const dynamic = "force-dynamic";

import { WatcherStatus } from "@banalize/types";
import { Box, Grid, GridCol, Group, Notification } from "@mantine/core";
import { IconFlag, IconHandStop } from "@tabler/icons-react";
import { ConfigEventsPaper } from "components/configs/ConfigEventsPaper";
import { ConfigGraphPaper } from "components/configs/ConfigGraphPaper";
import { ConfigHeader } from "components/configs/ConfigHeader";
import { ConfigStatsPaper } from "components/configs/ConfigStatsPaper";

import {
  fetchBans,
  fetchConfigById,
  fetchConfigs,
  fetchEvents,
  fetchIpInfos,
  fetchMatches,
  fetchStatsTimeline,
  fetchWatcherStatus,
} from "lib/api";

export async function generateStaticParams() {
  const configs = await fetchConfigs();

  return configs.map((config) => ({
    configId: config._id,
  }));
}

export default async function ConfigPage({
  params,
}: {
  params: { id: string };
}) {
  const configId = params.id;
  const { totalCount: matchesTotalCount } = await fetchMatches({
    configId,
    limit: 0,
  });
  const { totalCount: bansTotalCount } = await fetchBans({
    configId,
    limit: 0,
  });
  const config = await fetchConfigById(configId);
  const statsMonthly = await fetchStatsTimeline({
    configId,
    period: "monthly",
  });
  const statsWeekly = await fetchStatsTimeline({
    configId,
    period: "weekly",
  });
  const statsDaily = await fetchStatsTimeline({
    configId,
    period: "daily",
  });
  const stats = {
    monthly: statsMonthly,
    weekly: statsWeekly,
    daily: statsDaily,
  };
  const status = (await fetchWatcherStatus(configId))?.data?.[configId] ?? {
    error: undefined,
    status: WatcherStatus.UNKNWOWN,
  };

  const { totalCount: recentMatchesTotalCount } =
    (await fetchMatches({
      configId,
      timestamp_gt: new Date().getTime() - config.findTime * 1000,
      limit: 0,
    })) ?? [];

  const { totalCount: activeBansTotalCount } = await fetchBans({
    configId,
    active: true,
    limit: 0,
  });
  const { data: events, totalCount } = await fetchEvents({ configId });
  const ipList = Array.from(new Set(events.map((event) => event.ip)));
  const IpInfos = await fetchIpInfos({ ips: ipList });

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <ConfigHeader config={config} status={status} />
      </Group>

      <Group w={"100%"}>
        {status.error && (
          <Notification
            title="Error"
            color="red"
            w={"100%"}
            withCloseButton={false}
            mb="md"
          >
            {status.error}
          </Notification>
        )}
      </Group>

      <Grid>
        <GridCol span={12}>
          <ConfigGraphPaper {...stats} />
        </GridCol>

        <GridCol span={{ base: 12, sm: 12, md: 6 }}>
          <ConfigStatsPaper
            items={[
              {
                text: "Total Matches",
                value: matchesTotalCount.toString(),
                help: "Total number of matches recorded since the start",
              },
              {
                text: "Recent matches",
                value: recentMatchesTotalCount.toString(),
                help: "Matches that were created within the specified 'find time' threshold",
              },
            ]}
            title={"Matches stats"}
            icon={<IconFlag />}
          />
        </GridCol>

        <GridCol span={{ base: 12, sm: 12, md: 6 }}>
          <ConfigStatsPaper
            items={[
              {
                text: "Total Bans",
                value: bansTotalCount.toString(),
                help: "Total number of bans issued since the beginning",
              },
              {
                text: "Active bans",
                value: activeBansTotalCount.toString(),
                help: "Currently active bans in effect",
              },
            ]}
            title={"Bans stats"}
            icon={<IconHandStop />}
          />
        </GridCol>

        <GridCol span={12}>
          <ConfigEventsPaper
            events={events}
            totalCount={totalCount}
            config={config}
            ipInfos={IpInfos}
          />
        </GridCol>
      </Grid>
    </Box>
  );
}
