import { Box, Group } from "@mantine/core";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";

export default function IpPage({ params }: { params: { id: string } }) {
  const configId = params.id;

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
        <RouterBreadcrumbs path={`/configs/${configId}/ip`} />
      </Group>
    </Box>
  );
}
