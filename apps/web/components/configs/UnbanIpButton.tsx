"use client";

import { type ConfigSchema } from "@banalize/types";
import { ActionIcon, rem, Tooltip } from "@mantine/core";
import {IconHandOff, IconHandStop } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useBans } from "hooks/useBans";

type UnbanIpButtonProps = {
  config: ConfigSchema;
  ip: string;
};

export const UnbanIpButton = ({ config, ip }: UnbanIpButtonProps) => {
  const router = useRouter();
  const [configId, setConfigId] = useState(config._id);

  const [isCurrentlyBanned, setIsCurrentlyBanned] = useState(false);
  const [banId, setBanId] = useState<string | null>(null);

  const test = useBans({
    configId,
    ip,
    active: true,
  });
  console.log("test: ", test);

  //
  // useEffect(() => {
  //   const getCurrentlyBanned = async (config: ConfigSchema) => {
  //     const res = await fetch(`/api/bans?configId=${config._id}&active=true&ip=${ip}`, {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     });
  //
  //     if (!res.ok) {
  //       console.log("error");
  //       console.error(await res.json());
  //     }
  //
  //     const data = await res.json();
  //     console.log("data:", data);
  //     router.refresh();
  //   };
  //
  //   getCurrentlyBanned(config);
  //



    // const checkBanStatus = async () => {
    //   try {
    //     const banStatus = await fetchBans({
    //       configId,
    //       ip: ip,
    //       active: true,
    //     });
    //     console.log(banStatus);
    //     setIsCurrentlyBanned(banStatus.totalCount > 0);
    //     if (banStatus.totalCount > 0) {
    //       setBanId(banStatus.bans[0]._id);
    //     }
    //   } catch (error) {
    //     console.error("Error checking ban status:", error);
    //   }
    // };
    //
    // checkBanStatus();
  // }, [isCurrentlyBanned]);

console.log(isCurrentlyBanned);


  const updateBan = async (config: ConfigSchema) => {
    return;
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
