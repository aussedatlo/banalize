import { Box, Button, Group } from "@mantine/core";
import { IconEyePause, IconTrash } from "@tabler/icons-react";
import { EventsTablePaper } from "components/EventsTablePaper/EventsTablePaper";
import { HeaderStatPaper } from "components/HeaderStatPaper/HeaderStatPaper";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import { Ban } from "types/Ban";
import { Config } from "types/Config";
import { Match } from "types/Match";
import {
  deleteConfig,
  fetchBansByConfigId,
  fetchConfigById,
  fetchConfigs,
  fetchMatchesByConfigId,
} from "utils/api";

export async function getStaticPaths() {
  const configs = await fetchConfigs();

  const paths = configs.map((config: Config) => ({
    params: { id: config._id },
  }));

  return { paths, fallback: false };
}

export const getStaticProps = (async (context) => {
  const configId = context.params?.id?.toString() ?? "";
  const matches = await fetchMatchesByConfigId(configId);
  const bans = await fetchBansByConfigId(configId);
  const config = await fetchConfigById(configId);
  return { props: { matches, bans, config } };
}) satisfies GetStaticProps<{
  matches: Match[];
  bans: Ban[];
  config: Config;
}>;

export default function ConfigPage({
  matches,
  bans,
  config,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const router = useRouter();

  const onDelete = async () => {
    const result = await deleteConfig(config._id);
    if (result._id) {
      router.push("/configs");
    }
  };

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
        <RouterBreadcrumbs />
        <Group>
          <Button leftSection={<IconEyePause size={18} />} color="yellow">
            Disable
          </Button>
          <Button
            leftSection={<IconTrash size={18} />}
            onClick={onDelete}
            color="red"
          >
            Delete
          </Button>
        </Group>
      </Group>

      <HeaderStatPaper matches={matches} bans={bans} config={config} />

      <EventsTablePaper matches={matches} bans={bans} />
    </Box>
  );
}
