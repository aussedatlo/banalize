"use client";

import { Group, Skeleton, Text } from "@mantine/core";
import { useIpInfos } from "app/hooks/useIpInfos";

export const CountryText = ({ ip }: { ip: string }) => {
  const infos = useIpInfos(ip);

  if (!infos.country) {
    return <Skeleton width={100} height={22} />;
  }

  return (
    <Group gap="xs">
      <Text>{infos.country.flag}</Text>
      <Text fz="sm">{infos.country.name}</Text>
    </Group>
  );
};
