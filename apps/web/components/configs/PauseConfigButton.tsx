"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, rem, Tooltip } from "@mantine/core";
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
      <Tooltip label="Resume watcher" withArrow>
        <ActionIcon onClick={onResume} variant="filled" size="lg" color="pink">
          <IconPlayerPlay style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Tooltip label="Pause watcher" withArrow>
      <ActionIcon onClick={onPause} variant="filled" size="lg" color="cyan">
        <IconPlayerPause style={{ width: rem(18), height: rem(18) }} />
      </ActionIcon>
    </Tooltip>
  );
};
