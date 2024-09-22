import { Box, Group } from "@mantine/core";
import { ConfigPaperList } from "components/configs/ConfigPaperList";
import { CreateConfigButton } from "components/configs/CreateConfigButton";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { fetchConfigs, fetchStatsCount } from "lib/api";

export default async function ConfigsPage() {
  const configs = await fetchConfigs();
  const stats = await fetchStatsCount();

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
        <RouterBreadcrumbs path={"/configs"} />
        <CreateConfigButton />
      </Group>

      <ConfigPaperList configs={configs} stats={stats} />
    </Box>
  );
}
