"use client";

import { ConfigSchema } from "@banalize/types";
import {
  Box,
  BoxProps,
  Card,
  Divider,
  Group,
  rem,
  Skeleton,
  Text,
} from "@mantine/core";
import { useIpInfos } from "app/hooks/useIpInfos";
import { HighlightedText } from "components/shared/Text/HightlightedText";
import { type Event } from "lib/events";
import Image from "next/image";

type LineInformationProps = {
  label: string;
  value: string | number | React.ReactNode | undefined;
} & BoxProps;

export const LineInformation = ({
  label,
  value,
  ...props
}: LineInformationProps) => {
  return (
    <Group justify="space-between" mt="xs" p="xs" {...props}>
      <Text size="xs" fw="bold">
        {label}
      </Text>
      {value ? (
        <Text fz="sm" h={22}>
          {value}
        </Text>
      ) : (
        <Skeleton width={100} height={22} />
      )}
    </Group>
  );
};

type ConfigEventInformationProps = {
  config: ConfigSchema;
  event: Event;
};

export const ConfigEventInformation = ({
  config,
  event,
}: ConfigEventInformationProps) => {
  const ipInfos = useIpInfos(event.event.ip);
  const line = "line" in event.event ? event.event.line : undefined;

  return (
    <>
      <Card radius="md">
        <LineInformation label="Id" value={event.event._id} mt={rem(0)} />
        <Divider />
        <LineInformation label="Type" value={event.type} />
        <Divider />
        <LineInformation label="Time" value={event.timestamp} />
        <Divider />
        <LineInformation label="IP" value={event.event.ip} />
        <Divider />
        <LineInformation label="Status" value={event.details} />
      </Card>
      {line && (
        <>
          <Card radius="md" mt="lg">
            <HighlightedText text={line} regex={config.regex} />
          </Card>
        </>
      )}

      {ipInfos && (
        <>
          <Card radius="md" mt="lg">
            <LineInformation
              label="Continent"
              value={ipInfos.continent?.name}
              mt={rem(0)}
            />
            <Divider />
            <LineInformation
              label="Country"
              value={
                ipInfos.country && (
                  <Box display="flex" style={{ alignItems: "center" }}>
                    <Image
                      src={`https://raw.githubusercontent.com/lipis/flag-icons/refs/heads/main/flags/4x3/${ipInfos.country.iso_code.toLowerCase()}.svg`}
                      alt={`${ipInfos.country.name} flag`}
                      width={22}
                      height={22}
                      style={{ marginRight: 10 }}
                    />
                    {ipInfos.country.name}
                  </Box>
                )
              }
            />
          </Card>
        </>
      )}
    </>
  );
};
