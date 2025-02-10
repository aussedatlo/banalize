"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, rem, Tooltip } from "@mantine/core";
import { IconPlayerPause, IconPlayerPlay } from "@tabler/icons-react";
import { updateConfig } from "lib/api";
import { useRouter } from "next/navigation";

type EditConfigButtonProps = {
  config: ConfigSchema;
};

export const PauseConfigButton = ({ config }: EditConfigButtonProps) => {
  const router = useRouter();

  const update = async (config: ConfigSchema) => {
    await updateConfig(config).ifRight(() => {
      router.refresh();
    });
  };

  const onResume = async () => {
    update({
      ...config,
      paused: false,
    });
  };

  const onPause = async () => {
    update({
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
