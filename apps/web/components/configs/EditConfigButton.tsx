"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, Modal, rem, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { ConfigForm, ConfigFormType } from "components/configs/ConfigForm";
import { useEventsWithIpInfos } from "hooks/useEvents";
import { useRouter } from "next/navigation";

type EditConfigButtonProps = {
  config: ConfigSchema;
};

export const EditConfigButton = ({ config }: EditConfigButtonProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();
  const { mutate } = useEventsWithIpInfos({ configId: config._id });

  const onConfigEdit = async (
    config: ConfigFormType,
  ): Promise<ConfigSchema | { message: string }> => {
    const res = await fetch(`/api/configs/${config._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...config,
        ignoreIps:
          config.ignoreIps?.length > 0 ? config.ignoreIps.split(",") : [],
      }),
    });
    return await res.json();
  };

  const onDone = () => {
    close();
    router.refresh();
    mutate();
  };

  return (
    <>
      <Tooltip label="Edit config" withArrow>
        <ActionIcon
          onClick={() => open()}
          variant="filled"
          size="lg"
          color="cyan"
        >
          <IconEdit style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </Tooltip>

      <Modal opened={opened} onClose={close} title="Edit config">
        <ConfigForm
          onSumbit={onConfigEdit}
          onDone={onDone}
          initialConfig={{
            ...config,
            ignoreIps: config.ignoreIps ? config.ignoreIps.join(",") : "",
            paused: config.paused ?? false,
          }}
        />
      </Modal>
    </>
  );
};
