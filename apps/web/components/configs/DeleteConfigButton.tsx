"use client";

import { Button } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

type DeleteConfigButtonProps = {
  configId: string;
};

export const DeleteConfigButton = ({ configId }: DeleteConfigButtonProps) => {
  const router = useRouter();
  const onDelete = async () => {
    const res = await fetch(`/api/configs/${configId}`, {
      method: "DELETE",
    });
    const response = await res.json();

    if (response._id) {
      router.replace("/configs");
      router.refresh();
    }
  };

  return (
    <Button
      leftSection={<IconTrash size={18} />}
      color="pink"
      onClick={onDelete}
    >
      Delete
    </Button>
  );
};
