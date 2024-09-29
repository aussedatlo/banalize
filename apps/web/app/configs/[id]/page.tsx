export const dynamic = "force-dynamic";

import { Box, Button, Grid, GridCol, Group, Notification } from "@mantine/core";
import { IconEyePause, IconFlag, IconHandStop } from "@tabler/icons-react";
import { ConfigEventsPaper } from "components/configs/ConfigEventsPaper";
import { ConfigGraphPaper } from "components/configs/ConfigGraphPaper";
import { ConfigStatsPaper } from "components/configs/ConfigStatsPaper";
import { DeleteConfigButton } from "components/configs/DeleteConfigButton";
import { EditConfigButton } from "components/configs/EditConfigButton";
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
  const events = formatEvents(matches, bans, unbans);

  return (
    <Box mt={"xl"}>
      <Group justify="space-between" mb="lg">
        <RouterBreadcrumbs path={`/configs/${configId}`} />
        <Group>
          <TryRegexConfigButton config={config} />
          <EditConfigButton config={config} />
          <Button leftSection={<IconEyePause size={18} />} color="yellow">
            Disable
          </Button>
          <DeleteConfigButton configId={configId} />
        </Group>
      </Group>

      <Group w={"100%"} mb="md">
        {status.error && (
          <Notification
            title="Error"
            color="red"
            w={"100%"}
            withCloseButton={false}
          >
            {status.error}
          </Notification>
        )}
      </Group>

      <Grid>
        <GridCol span={12}>
          <ConfigGraphPaper {...stats} />
        </GridCol>

        <GridCol span={6}>
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

        <GridCol span={6}>
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
