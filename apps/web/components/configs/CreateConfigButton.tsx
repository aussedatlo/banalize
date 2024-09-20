"use client";

import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { ConfigForm, ConfigFormType } from "components/configs/ConfigForm";
import { useRouter } from "next/navigation";

export const CreateConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  const onConfigCreate = async (config: ConfigFormType) => {
    const res = await fetch("/api/configs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...config,
        ignoreIps: config.ignoreIps.split(","),
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
        leftSection={<IconPlus size={18} />}
        color="yellow"
        onClick={() => open()}
      >
        Create Config
      </Button>

      <Modal opened={opened} onClose={close} title="Create a new configuration">
        <ConfigForm onSumbit={onConfigCreate} onDone={onDone} />
      </Modal>
    </>
  );
};
