"use client";

import { ConfigSchema, WatcherStatusData } from "@banalize/types";
import { Group, Modal, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit, IconTestPipe, IconTrash } from "@tabler/icons-react";
import { Menu } from "components/shared/Menu/Menu";
import { ConfirmationModal } from "components/shared/Modal/ConfirmationModal";
import { RouterBreadcrumbs } from "components/shared/RouterBreadcrumbs/RouterBreadcrumbs";
import { useEventsWithIpInfos } from "hooks/useEvents";
import { deleteConfig, updateConfig } from "lib/api";
import { useRouter } from "next/navigation";
import { ConfigForm, ConfigFormType } from "./ConfigForm";
import { ConfigStatusBadge } from "./ConfigStatusBadge";
import { TestRegexModal } from "./TestRegexModal";

type ConfigHeaderProps = {
  config: ConfigSchema;
  status: WatcherStatusData;
};

export const ConfigHeader = ({ config, status }: ConfigHeaderProps) => {
  const router = useRouter();
  const [
    DeleteModalOpened,
    { open: DeleteModalOpen, close: DeleteModalClose },
  ] = useDisclosure(false);
  const [EditModalOpened, { open: EditModalOpen, close: EditModalClose }] =
    useDisclosure(false);
  const [
    TestRegexModalOpened,
    { open: TestRegexModalOpen, close: TestRegexModalClose },
  ] = useDisclosure(false);
  const { mutate } = useEventsWithIpInfos({ configId: config._id });

  const onConfirmDelete = async () => {
    await deleteConfig(config._id).ifRight(() => {
      router.replace("/configs");
      router.refresh();
    });
  };

  const onConfigEdit = async (config: ConfigFormType) => {
    if (!config._id) {
      throw new Error("Config id is required");
    }

    const dto: ConfigSchema = {
      ...(config as ConfigFormType & { _id: string }),
    };

    await updateConfig(dto).ifRight(() => {
      close();
      router.refresh();
      mutate();
    });
  };

  return (
    <Group justify="space-between" mb="lg" w="100%">
      <Group>
        <RouterBreadcrumbs
          path={`/configs/${config._id}`}
          displayedPath={`/configs/${config.name}`}
        />
        <ConfigStatusBadge data={status} />
      </Group>

      <Menu
        items={[
          {
            text: "Try Regex",
            onClick: TestRegexModalOpen,
            icon: <IconTestPipe style={{ width: rem(16), height: rem(16) }} />,
          },
          {
            text: "Edit",
            onClick: EditModalOpen,
            icon: <IconEdit style={{ width: rem(16), height: rem(16) }} />,
          },
          {
            text: "Delete",
            onClick: DeleteModalOpen,
            icon: <IconTrash style={{ width: rem(16), height: rem(16) }} />,
          },
        ]}
      />

      <ConfirmationModal
        message="Are you sure to delete configuration ? The action is irreversible."
        title="Delete config"
        opened={DeleteModalOpened}
        onConfirm={onConfirmDelete}
        onCancel={DeleteModalClose}
      />

      <Modal
        opened={EditModalOpened}
        onClose={EditModalClose}
        title="Edit config"
      >
        <ConfigForm
          onSumbit={onConfigEdit}
          initialConfig={{
            ...config,
            ignoreIps: config.ignoreIps ?? [""],
            paused: config.paused ?? false,
          }}
        />
      </Modal>

      <TestRegexModal
        onClose={TestRegexModalClose}
        opened={TestRegexModalOpened}
        regex={config.regex}
      />
    </Group>
  );
};
