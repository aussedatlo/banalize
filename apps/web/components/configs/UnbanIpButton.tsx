"use client";

export const dynamic = "force-dynamic";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, rem, Tooltip } from "@mantine/core";
import {IconHandOff, IconHandStop } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchBans } from "lib/api";

type UnbanIpButtonProps = {
  config: ConfigSchema;
  ip: string;
};

export const UnbanIpButton = ({ config, ip }: UnbanIpButtonProps) => {
  const router = useRouter();
  const [configId, setConfigId] = useState(config._id);

  const [isCurrentlyBanned, setIsCurrentlyBanned] = useState(false);
  const [banId, setBanId] = useState<string | null>(null);

  useEffect(() => {
    const checkBanStatus = async () => {
      try {
        const banStatus = await fetchBans({
          configId,
          ip: ip,
          active: true,
        });
        console.log(banStatus);
        setIsCurrentlyBanned(banStatus.totalCount > 0);
        if (banStatus.totalCount > 0) {
          setBanId(banStatus.bans[0]._id);
        }
      } catch (error) {
        console.error("Error checking ban status:", error);
      }
    };

    checkBanStatus();
  }, [isCurrentlyBanned]);

console.log(isCurrentlyBanned);


  const updateBan = async (config: ConfigSchema) => {
    const res = await fetch(`/api/bans/${banId}/disable`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      }
    });

    if (!res.ok) {
      console.error(await res.json());
    }

    router.refresh();
  };

  const unban = async () => {
    await updateBan({
      ...config,
    });
  };

  const ban = async () => {

  };


  if (isCurrentlyBanned) {
    return (
      <Tooltip label="Ban this IP" withArrow>
        <ActionIcon onClick={ban} variant="filled" size="lg" color="pink">
          <IconHandStop style={{ width: rem(18), height: rem(18) }} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Tooltip label="Unban this IP" withArrow>
      <ActionIcon onClick={unban} variant="filled" size="lg" color="cyan">
        <IconHandOff style={{ width: rem(18), height: rem(18) }} />
      </ActionIcon>
    </Tooltip>
  );
};
