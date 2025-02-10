"use client";

import { ActionIcon, rem, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { deleteConfig } from "lib/api";
import { useRouter } from "next/navigation";

type DeleteConfigButtonProps = {
  configId: string;
};

export const DeleteConfigButton = ({ configId }: DeleteConfigButtonProps) => {
  const router = useRouter();
  const onDelete = async () => {
    await deleteConfig(configId).ifRight(() => {
      router.replace("/configs");
      router.refresh();
    });
  };

  return (
    <Tooltip label="Delete config" withArrow>
      <ActionIcon onClick={onDelete} variant="filled" size="lg" color="pink">
        <IconTrash style={{ width: rem(18), height: rem(18) }} />
      </ActionIcon>
    </Tooltip>
  );
};
