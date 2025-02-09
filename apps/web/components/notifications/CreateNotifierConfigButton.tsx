"use client";

import { NotifierConfigDto } from "@banalize/types";
import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus } from "@tabler/icons-react";
import { createNotifierConfig } from "lib/api";
import { useRouter } from "next/navigation";
import { NotifierConfigForm } from "./NotifierConfigForm";

export const CreateNotifierConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

  const onSubmit = async (dto: NotifierConfigDto) => {
    const result = await createNotifierConfig(dto);

    if (result && result._id) {
      notifications.show({
        title: "Config created",
        message: "Notifier config was successfully created",
        color: "cyan",
      });
    } else {
      notifications.show({
        title: "Config creation failed",
        message: "Notifier config was not created",
        color: "pink",
      });
    }
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
