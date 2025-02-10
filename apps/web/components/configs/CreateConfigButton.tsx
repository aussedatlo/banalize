"use client";

import { ConfigCreationDto } from "@banalize/types";
import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { ConfigForm, ConfigFormType } from "components/configs/ConfigForm";
import { createConfig } from "lib/api";
import { useRouter } from "next/navigation";

export const CreateConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  const onConfigCreate = async (config: ConfigFormType) => {
    const dto: ConfigCreationDto = {
      ...config,
      ignoreIps:
        config.ignoreIps?.length > 0 ? config.ignoreIps.split(",") : [],
      paused: false,
    };

    await createConfig(dto).ifRight(() => {
      close();
      router.refresh();
    });
  };

  return (
    <>
      <Button
        leftSection={<IconPlus size={18} />}
        color="pink"
        onClick={() => open()}
      >
        Create Config
      </Button>

      <Modal opened={opened} onClose={close} title="Create a new configuration">
        <ConfigForm onSumbit={onConfigCreate} />
      </Modal>
    </>
  );
};
