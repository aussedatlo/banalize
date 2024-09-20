export const dynamic = "force-dynamic";

import { Box, Button, Grid, GridCol, Group } from "@mantine/core";
import { IconEyePause } from "@tabler/icons-react";
import { ConfigEventsPaper } from "components/configs/ConfigEventsPaper";
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
  const config = await fetchConfigById(configId);

  const activeMatches = await fetchActiveMatches(
    configId,
    new Date().getTime() - config.banTime * 1000,
  );

  const activeBans = await fetchActiveBans(configId);

  const events = formatEvents(matches, bans);

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
