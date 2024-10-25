"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, rem, Tooltip } from "@mantine/core";
import { IconHandOff, IconHandStop } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchBans } from "lib/api";

type UnbanIpButtonProps = {
  config: ConfigSchema;
  ip: string;
};

export const UnbanIpButton = ({ config, ip }: UnbanIpButtonProps) => {
  const router = useRouter();
  const [configId] = useState(config._id);
  const [isCurrentlyBanned, setIsCurrentlyBanned] = useState(false);
  const [banId, setBanId] = useState<string | null>(null);

  useEffect(() => {
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
        }
      } catch (error) {
        console.error("Error fetching bans:", error);
      }
    };
    fetchBanStatus();
  }, [configId, ip]);

  const updateBan = async (config: ConfigSchema) => {
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
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Error updating ban:", error);
    }
  };

  const unban = async () => {
    await updateBan({
      ...config,
    });
  };

  const ban = async () => {
    // Implémentez votre logique de ban ici
    try {
      console.log("Not implemented yet");
    }
    catch (error) {
      console.error("Error updating ban:", error);
    }

  };

  return (
      <Tooltip label={isCurrentlyBanned ? "Unban this IP" : "Ban this IP"} withArrow>
        <ActionIcon
            onClick={isCurrentlyBanned ? unban : ban}
            variant="filled"
            size="lg"
            color={isCurrentlyBanned ? "cyan" : "pink"}
        >
          {isCurrentlyBanned ? (
              <IconHandOff style={{ width: rem(18), height: rem(18) }} />
          ) : (
              <IconHandStop style={{ width: rem(18), height: rem(18) }} />
          )}
        </ActionIcon>
      </Tooltip>
  );
};