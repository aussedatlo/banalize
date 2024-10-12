import { ConfigSchema, EventResponse, IpInfosResponse } from "@banalize/types";
import {
  BoxProps,
  Card,
  Divider,
  Group,
  rem,
  Skeleton,
  Text,
} from "@mantine/core";
import { StatusBadge } from "components/shared/Badge/StatusBadge";
import { EventIcon } from "components/shared/Icon/EventIcon";
import { HighlightedText } from "components/shared/Text/HightlightedText";
import { IconText } from "components/shared/Text/IconText";

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
  event: EventResponse;
  ipInfos: Partial<IpInfosResponse>;
};

export const ConfigEventInformation = ({
  config,
  event,
  ipInfos,
}: ConfigEventInformationProps) => {
  const line = "line" in event ? event.line : undefined;

  return (
    <>
      <Card radius="md">
        <LineInformation
          label="Type"
          value={
            <IconText
              text={event.type}
              icon={<EventIcon type={event.type} />}
              textProps={{ style: { textTransform: "capitalize" } }}
            />
          }
        />
        <Divider />
        <LineInformation
          label="Time"
          value={new Date(event.timestamp).toLocaleString()}
        />
        <Divider />
        <LineInformation label="IP" value={event.ip} />
        <Divider />
        <LineInformation
          label="Status"
          value={<StatusBadge status={event.status} />}
        />
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
                  <Group gap="xs">
                    <Text>{ipInfos.country.flag}</Text>
                    <Text fz="sm">{ipInfos.country.name}</Text>
                  </Group>
                )
              }
            />
          </Card>
        </>
      )}
    </>
  );
};
