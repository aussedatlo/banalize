"use client";

import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useNotifications } from "hooks/useNotifications";
import { NotifierConfigForm } from "./NotifierConfigForm";

export const CreateNotifierConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { create } = useNotifications();

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
        <NotifierConfigForm onCancel={close} onSubmit={create} />
      </Modal>
    </>
  );
};
