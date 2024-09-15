import { Box, Button, Group, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { ConfigForm } from "components/configs/ConfigForm/ConfigForm";
import { ConfigList } from "components/configs/ConfigList/ConfigList";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import type { GetStaticProps, InferGetStaticPropsType } from "next";
import { useRouter } from "next/router";
import { Config } from "types/Config";
import { fetchConfigs } from "utils/api";

export const getStaticProps = (async () => {
  const configs = await fetchConfigs();
  return { props: { configs } };
}) satisfies GetStaticProps<{
  configs: Config[];
}>;

export default function ConfigsPage({
  configs,
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  const onDone = () => {
    close();
    router.push("/configs");
  };

  return (
    <Box mt={"xl"}>
      <Group justify="space-between">
        <RouterBreadcrumbs />
        <Button
          leftSection={<IconPlus size={18} />}
          onClick={open}
          color="yellow"
        >
          New config
        </Button>
      </Group>

      <Modal opened={opened} onClose={close} title="Create a new configuration">
        <ConfigForm onDone={onDone} />
      </Modal>

      <ConfigList configs={configs} />
    </Box>
  );
}
