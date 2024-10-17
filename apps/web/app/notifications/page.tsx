import { Box, Grid, GridCol, Group } from "@mantine/core";
import { CreateNotifierConfigButton } from "components/notifications/CreateNotifierConfigButton";
import { NotifierConfigPaper } from "components/notifications/NotifierConfigPaper";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { fetchNotifierConfigs } from "lib/api";

export default async function ConfigsPage() {
  const configs = await fetchNotifierConfigs();

  return (
    <Box>
      <Group justify="space-between" mb="lg">
        <RouterBreadcrumbs path={"/notifications"} />
        <CreateNotifierConfigButton />
      </Group>

      <Grid>
        {configs.map((config) => (
          <GridCol span={{ base: 12, xs: 4 }} key={config._id}>
            <NotifierConfigPaper config={config} />
          </GridCol>
        ))}
      </Grid>
    </Box>
  );
}
