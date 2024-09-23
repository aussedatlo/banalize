"use client";

import { ConfigSchema } from "@banalize/api";
import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { ConfigForm, ConfigFormType } from "components/configs/ConfigForm";
import { useRouter } from "next/navigation";

type EditConfigButtonProps = {
  config: ConfigSchema;
};

export const EditConfigButton = ({ config }: EditConfigButtonProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

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
          config.ignoreIps?.length > 0
            ? config.ignoreIps.split(",")
            : undefined,
      }),
    });
    return await res.json();
  };

  const onDone = () => {
    close();
    router.refresh();
  };

  return (
    <>
      <Button
        leftSection={<IconEdit size={18} />}
        color="blue"
        onClick={() => open()}
      >
        Edit
      </Button>

      <Modal opened={opened} onClose={close} title="Edit config">
        <ConfigForm
          onSumbit={onConfigEdit}
          onDone={onDone}
          initialConfig={{ ...config, ignoreIps: config.ignoreIps.join(",") }}
        />
      </Modal>
    </>
  );
};
