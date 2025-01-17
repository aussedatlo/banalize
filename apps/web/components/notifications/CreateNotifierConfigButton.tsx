"use client";

import { NotifierConfigDto } from "@banalize/types";
import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { useNotifications } from "hooks/useNotifications";
import { useRouter } from "next/navigation";
import { NotifierConfigForm } from "./NotifierConfigForm";

export const CreateNotifierConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const { create } = useNotifications();
  const router = useRouter();

  const onSubmit = async (dto: NotifierConfigDto) => {
    const result = await create(dto);
    router.refresh();
    close();

    return result;
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
        <NotifierConfigForm onCancel={close} onSubmit={onSubmit} />
      </Modal>
    </>
  );
};
