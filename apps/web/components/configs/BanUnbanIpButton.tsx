"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, Notification, rem, Tooltip } from "@mantine/core";
import { IconHandOff, IconHandStop } from "@tabler/icons-react";
import { useBans } from "hooks/useBans";
import { useEventsWithIpInfos } from "hooks/useEvents";
import { ban, unban } from "lib/api";
import { useState } from "react";

type UnbanIpButtonProps = {
  config: ConfigSchema;
  ip: string;
};

export const BanUnbanIpButton = ({ config, ip }: UnbanIpButtonProps) => {
  const [configId] = useState(config._id);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const {
    bans,
    totalCount: isBanned,
    mutate: mutateBans,
  } = useBans({
    configId,
    ip,
    active: true,
  });
  const { mutate: mutateEvents } = useEventsWithIpInfos({
    configId,
    ip,
  });

  const onBan = async () => {
    try {
      await ban({ configId, ip, timestamp: new Date().getTime() });
      setSuccess("IP was banned");
    } catch (error) {
      setError("Failed to ban IP");
    } finally {
      mutateBans();
      mutateEvents();
    }
  };

  const onUnban = async () => {
    try {
      const promise = bans?.map((ban) => unban(ban._id));
      await Promise.all(promise ?? []);
      setSuccess("IP was unbanned");
    } catch (error) {
      setError("Failed to unban IP");
    } finally {
      mutateBans();
      mutateEvents();
    }
  };

  return (
    <>
      {error && (
        <Notification
          title="Error"
          color="red"
          withCloseButton
          onClose={() => setError(null)}
        >
          {error}
        </Notification>
      )}

      {success && (
        <Notification
          title="Success"
          color="green"
          withCloseButton
          onClose={() => setSuccess(null)}
        >
          {success}
        </Notification>
      )}

      <Tooltip label={isBanned ? "Unban this IP" : "Ban this IP"} withArrow>
        <ActionIcon
          onClick={isBanned ? onUnban : onBan}
          variant="filled"
          size="lg"
          color={isBanned ? "cyan" : "pink"}
        >
          {isBanned ? (
            <IconHandOff style={{ width: rem(18), height: rem(18) }} />
          ) : (
            <IconHandStop style={{ width: rem(18), height: rem(18) }} />
          )}
        </ActionIcon>
      </Tooltip>
    </>
  );
};
