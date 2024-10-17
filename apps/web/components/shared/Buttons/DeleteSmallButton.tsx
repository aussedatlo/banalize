"use client";

import { ActionIcon, rem, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";

type DeleteSmallButtonProps = {
  onDelete: () => void;
};

export const DeleteSmallButton = ({ onDelete }: DeleteSmallButtonProps) => {
  return (
    <Tooltip label="Delete config" withArrow>
      <ActionIcon onClick={onDelete} variant="filled" size="lg" color="pink">
        <IconTrash style={{ width: rem(18), height: rem(18) }} />
      </ActionIcon>
    </Tooltip>
  );
};
