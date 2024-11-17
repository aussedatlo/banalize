"use client";

import { ActionIcon, rem, Tooltip } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

type EditSmallButtonProps = {
  onEdit: () => void;
};

export const EditSmallButton = ({ onEdit }: EditSmallButtonProps) => {
  return (
    <>
      <Tooltip label="Edit" withArrow>
        <ActionIcon onClick={onEdit} variant="filled" size="lg" color="cyan">
          <IconEdit style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </Tooltip>
    </>
  );
};
