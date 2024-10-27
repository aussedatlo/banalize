"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, Notification, rem, Tooltip } from "@mantine/core";
import { IconHandOff, IconHandStop, IconLoader2 } from "@tabler/icons-react";
import { fetchBans } from "lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type UnbanIpButtonProps = {
  config: ConfigSchema;
  ip: string;
};

export const BanUnbanIpButton = ({ config, ip }: UnbanIpButtonProps) => {
  const router = useRouter();
  const [configId] = useState(config._id);
  const [isCurrentlyBanned, setIsCurrentlyBanned] = useState(false);
  const [banId, setBanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchBanStatus = async () => {
    try {
      const bans = await fetchBans({
        configId,
        ip,
        active: true,
      });
      setIsCurrentlyBanned(bans.totalCount > 0);
      if (bans.totalCount > 0 && bans.bans.length > 0) {
        setBanId(bans.bans[0]._id);
      } else {
        setBanId(null);
      }
    } catch (error) {
      console.error("Error fetching bans:", error);
      setError("Failed to fetch ban status");
    }
  };

  useEffect(() => {
    fetchBanStatus();
  }, [configId, ip]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const updateBan = async () => {
    if (isLoading) return;

    setIsLoading(true);
    clearMessages();

    try {
      const res = await fetch(`/api/bans/${banId}/disable`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        setError(`Failed to unban IP ${ip}`);
        return;
      }

      setIsCurrentlyBanned(false);
      setBanId(null);
      setSuccess(`IP ${ip} has been unbanned`);
      router.refresh();
    } catch (error) {
      console.error("Error updating ban:", error);
      setError(`Failed to unban IP ${ip}`);
    } finally {
      setIsLoading(false);
      setTimeout(clearMessages, 3000);
    }
  };

  const unban = async () => {
    await updateBan();
  };

  const ban = async () => {
    if (isLoading) return;

    setIsLoading(true);
    clearMessages();

    try {
      const res = await fetch("/api/bans/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ip,
          timestamp: new Date().getTime(),
          configId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error(errorData);
        setError(`Failed to ban IP ${ip}`);
        return;
      }

      await fetchBanStatus();
      setSuccess(`IP ${ip} has been banned`);
      router.refresh();
    } catch (error) {
      console.error("Error updating ban:", error);
      setError(`Failed to ban IP ${ip}`);
    } finally {
      setIsLoading(false);
      setTimeout(clearMessages, 3000);
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

      <Tooltip
        label={isCurrentlyBanned ? "Unban this IP" : "Ban this IP"}
        withArrow
      >
        <ActionIcon
          onClick={isCurrentlyBanned ? unban : ban}
          variant="filled"
          size="lg"
          color={isCurrentlyBanned ? "cyan" : "pink"}
          disabled={isLoading}
          loading={isLoading}
        >
          {isLoading ? (
            <IconLoader2
              style={{ width: rem(18), height: rem(18) }}
              className="animate-spin"
            />
          ) : isCurrentlyBanned ? (
            <IconHandOff style={{ width: rem(18), height: rem(18) }} />
          ) : (
            <IconHandStop style={{ width: rem(18), height: rem(18) }} />
          )}
        </ActionIcon>
      </Tooltip>
    </>
  );
};
