export const dynamic = "force-dynamic";

import { Box, Button, Grid, GridCol, Group } from "@mantine/core";
import { IconEyePause } from "@tabler/icons-react";
import { ConfigEventsPaper } from "components/configs/ConfigEventsPaper";
import { ConfigGraphPaper } from "components/configs/ConfigGraphPaper";
import { ConfigInfoPaper } from "components/configs/ConfigInfoPaper";
import { ConfigStatsPaper } from "components/configs/ConfigStatsPaper";
import { DeleteConfigButton } from "components/configs/DeleteConfigButton";
import { EditConfigButton } from "components/configs/EditConfigButton";
import { TryRegexConfigButton } from "components/configs/TryRegexConfigButton";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";

import {
  fetchActiveBans,
  fetchActiveMatches,
  fetchBansByConfigId,
  fetchConfigById,
  fetchConfigs,
  fetchMatchesByConfigId,
  fetchStatsByConfigId,
  fetchUnbansByConfigId,
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
  const statsMonthly = await fetchStatsByConfigId(configId, "monthly");
  const statsWeekly = await fetchStatsByConfigId(configId, "weekly");
  const statsDaily = await fetchStatsByConfigId(configId, "daily");
  const stats = {
    monthly: statsMonthly,
    weekly: statsWeekly,
    daily: statsDaily,
  };

  const activeMatches = await fetchActiveMatches(
    configId,
    new Date().getTime() - config.findTime * 1000,
  );

  const activeBans = await fetchActiveBans(configId);
  const events = formatEvents(matches, bans, unbans);

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
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

      <Grid>
        <GridCol span={12}>
          <ConfigGraphPaper {...stats} />
        </GridCol>
        <GridCol span={4}>
          <ConfigInfoPaper config={config} />
        </GridCol>

        <GridCol span={8}>
          <ConfigStatsPaper
            matches={matches}
            bans={bans}
            activeMatches={activeMatches}
            activeBans={activeBans}
          />
        </GridCol>

        <GridCol span={12}>
          <ConfigEventsPaper events={events} />
        </GridCol>
      </Grid>
    </Box>
  );
}
