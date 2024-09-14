import { Box, Button, Group } from "@mantine/core";
import { IconEyePause, IconTrash } from "@tabler/icons-react";
import { EventsTablePaper } from "components/EventsTablePaper/EventsTablePaper";
import { HeaderStatPaper } from "components/HeaderStatPaper/HeaderStatPaper";
import { RouterBreadcrumbs } from "components/RouterBreadcrumbs/RouterBreadcrumbs";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import { Ban } from "types/Ban";
import { Config } from "types/Config";
import { Match } from "types/Match";

export async function getStaticPaths() {
  const res = await fetch(
    "http://localhost:" + process.env.SERVER_PORT + "/configs",
  );
  const configs = await res.json();

  const paths = configs.map((config: Config) => ({
    params: { id: config._id },
  }));

  return { paths, fallback: false };
}

const fetchMatches = async (configId: string) => {
  const filters = {
    configId,
  };
  const queryString = new URLSearchParams(filters).toString();
  const res = await fetch(
    "http://localhost:" + process.env.SERVER_PORT + `/matches?${queryString}`,
  );
  return await res.json();
};

const fetchBans = async (configId: string) => {
  const filters = {
    configId,
  };
  const queryString = new URLSearchParams(filters).toString();
  const res = await fetch(
    "http://localhost:" + process.env.SERVER_PORT + `/bans?${queryString}`,
  );
  return await res.json();
};

const fetchConfig = async (configId: string) => {
  const res = await fetch(
    "http://localhost:" + process.env.SERVER_PORT + `/configs/${configId}`,
  );
  return await res.json();
};

export const getStaticProps = (async (context) => {
  const configId = context.params?.id?.toString() ?? "";
  const matches = await fetchMatches(configId);
  const bans = await fetchBans(configId);
  const config = await fetchConfig(configId);
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

  const onDelete = () => {
    fetch(`/api/configs/${router.query.id}`, {
      method: "DELETE",
    }).then(() => {
      router.push("/configs");
    });
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
