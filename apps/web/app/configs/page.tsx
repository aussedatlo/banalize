import { Box, Group } from "@mantine/core";
import { ConfigPaperList } from "components/configs/ConfigPaperList";
import { CreateConfigButton } from "components/configs/CreateConfigButton";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { fetchConfigs, fetchStatsSummary, fetchWatcherStatuses } from "lib/api";

export default async function ConfigsPage() {
  const configs = await fetchConfigs();
  const stats = await fetchStatsSummary();
  const statuses = await fetchWatcherStatuses();

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
        <RouterBreadcrumbs path={"/configs"} />
        <CreateConfigButton />
      </Group>

      <ConfigPaperList configs={configs} stats={stats} statuses={statuses} />
    </Box>
  );
}
