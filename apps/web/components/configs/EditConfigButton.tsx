"use client";

import { Button, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconEdit } from "@tabler/icons-react";
import { ConfigForm } from "components/configs/ConfigForm";
import { updateConfig } from "lib/api";
import { useRouter } from "next/navigation";
import { Config } from "types/Config";

type EditConfigButtonProps = {
  config: Config;
};

export const EditConfigButton = ({ config }: EditConfigButtonProps) => {
  const [opened, { open, close }] = useDisclosure(false);
  const router = useRouter();

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
          onSumbit={(config) => updateConfig({ _id: "", ...config })}
          onDone={onDone}
          initialConfig={config}
        />
      </Modal>
    </>
  );
};
