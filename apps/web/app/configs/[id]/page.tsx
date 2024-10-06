export const dynamic = "force-dynamic";

import { Box, Grid, GridCol, Group, Notification } from "@mantine/core";
import { IconFlag, IconHandStop } from "@tabler/icons-react";
import { ConfigEventsPaper } from "components/configs/ConfigEventsPaper";
import { ConfigGraphPaper } from "components/configs/ConfigGraphPaper";
import { ConfigStatsPaper } from "components/configs/ConfigStatsPaper";
import { ConfigStatusBadge } from "components/configs/ConfigStatusBadge";
import { DeleteConfigButton } from "components/configs/DeleteConfigButton";
import { EditConfigButton } from "components/configs/EditConfigButton";
import { PauseConfigButton } from "components/configs/PauseConfigButton";
import { TryRegexConfigButton } from "components/configs/TryRegexConfigButton";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";

import {
  fetchActiveBans,
  fetchBansByConfigId,
  fetchConfigById,
  fetchConfigs,
  fetchMatchesByConfigId,
  fetchRecentMatches,
  fetchStatsTimelineByConfigId,
  fetchUnbansByConfigId,
  fetchWatcherStatus,
} from "lib/api";
import { formatEvents } from "lib/events";

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
  const matches = await fetchMatchesByConfigId(configId);
  const bans = await fetchBansByConfigId(configId);
  const unbans = await fetchUnbansByConfigId(configId);
  const config = await fetchConfigById(configId);
  const statsMonthly = await fetchStatsTimelineByConfigId(configId, "monthly");
  const statsWeekly = await fetchStatsTimelineByConfigId(configId, "weekly");
  const statsDaily = await fetchStatsTimelineByConfigId(configId, "daily");
  const stats = {
    monthly: statsMonthly,
    weekly: statsWeekly,
    daily: statsDaily,
  };
  const status = (await fetchWatcherStatus(configId)).data[configId];

  const recentMatches = await fetchRecentMatches(
    configId,
    new Date().getTime() - config.findTime * 1000,
  );

  const activeBans = await fetchActiveBans(configId);
  const events = formatEvents(matches, bans, unbans, config);

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <Group>
          <RouterBreadcrumbs path={`/configs/${config.name}`} />
          <ConfigStatusBadge data={status} />
        </Group>
        <Group>
          <TryRegexConfigButton config={config} />
          <EditConfigButton config={config} />
          <PauseConfigButton config={config} />
          <DeleteConfigButton configId={configId} />
        </Group>
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
                value: matches.length.toString(),
                help: "Total number of matches recorded since the start",
              },
              {
                text: "Recent matches", // Replaced "Active matches" with "Recent matches"
                value: recentMatches.length.toString(), // Changed variable name for clarity
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
                value: bans.length.toString(),
                help: "Total number of bans issued since the beginning",
              },
              {
                text: "Active bans",
                value: activeBans.length.toString(),
                help: "Currently active bans in effect",
              },
            ]}
            title={"Bans stats"}
            icon={<IconHandStop />}
          />
        </GridCol>

        <GridCol span={12}>
          <ConfigEventsPaper events={events} />
        </GridCol>
      </Grid>
    </Box>
  );
}
