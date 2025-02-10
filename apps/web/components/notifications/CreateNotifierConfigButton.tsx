"use client";

import { NotifierConfigDto } from "@banalize/types";
import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { createNotifierConfig } from "lib/api";
import { useRouter } from "next/navigation";
import { NotifierConfigForm } from "./NotifierConfigForm";

export const CreateNotifierConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  const onSubmit = async (dto: NotifierConfigDto) => {
    await createNotifierConfig(dto).ifRight(() => {
      router.refresh();
      close();
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
        <NotifierConfigForm onSubmit={onSubmit} />
      </Modal>
    </>
  );
};
