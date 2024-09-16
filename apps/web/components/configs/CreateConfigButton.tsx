"use client";

import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { ConfigForm } from "components/configs/ConfigForm";
import { createConfig } from "lib/api";
import { useRouter } from "next/navigation";

export const CreateConfigButton = () => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

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
        <ConfigForm
          onSumbit={(config) => createConfig(config)}
          onDone={onDone}
        />
      </Modal>
    </>
  );
};
