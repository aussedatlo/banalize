"use client";

import { Button } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { deleteConfig } from "lib/api";
import { useRouter } from "next/navigation";

type DeleteConfigButtonProps = {
  configId: string;
};

export const DeleteConfigButton = ({ configId }: DeleteConfigButtonProps) => {
  const router = useRouter();
  const onDelete = async () => {
    const response = await deleteConfig(configId);

    if (response._id) {
      router.replace("/configs");
      router.refresh();
    }
  };

  return (
    <Button
      leftSection={<IconTrash size={18} />}
      color="red"
      onClick={onDelete}
    >
      Delete
    </Button>
  );
};
