"use client";

import { type ConfigSchema } from "@banalize/types";
import { Button, em } from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

type EditConfigButtonProps = {
  config: ConfigSchema;
};

export const PauseConfigButton = ({ config }: EditConfigButtonProps) => {
  const router = useRouter();

  const updateConfig = async (config: ConfigSchema) => {
    const res = await fetch(`/api/configs/${config._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!res.ok) {
      console.error(await res.json());
    }

    router.refresh();
  };

  const onResume = async () => {
    updateConfig({
      ...config,
      paused: false,
    });
  };

  const onPause = async () => {
    updateConfig({
      ...config,
      paused: true,
    });
  };

  if (config.paused) {
    return (
      <Button
        leftSection={<IconPlayerPlay size={18} />}
        color="pink"
        onClick={onResume}
        w={em(140)}
      >
        Resume
      </Button>
    );
  }

  return (
    <Button
      leftSection={<IconPlayerPause size={18} />}
      color="pink"
      onClick={onPause}
      w={em(140)}
    >
      Pause
    </Button>
  );
};
