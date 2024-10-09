import { ConfigSchema } from "@banalize/types";
import { Box, BoxProps, Card, Divider, Group, rem, Text } from "@mantine/core";
import { HighlightedText } from "components/shared/Text/HightlightedText";
import { Event } from "lib/events";

type LineInformationProps = {
  label: string;
  value: string | number | React.ReactNode;
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
      <Box fz="sm">{value}</Box>
    </Group>
  );
};

type ConfigEventInformationProps = {
  config: ConfigSchema;
  event?: Event;
};

export const ConfigEventInformation = ({
  config,
  event,
}: ConfigEventInformationProps) => {
  return (
    <>
      <Card radius="md">
        <LineInformation label="Id" value={event?._id} mt={rem(0)} />
        <Divider />
        <LineInformation label="Type" value={event?.type} />
        <Divider />
        <LineInformation label="Time" value={event?.time} />
        <Divider />
        <LineInformation label="IP" value={event?.ip} />
        <Divider />
        <LineInformation label="Status" value={event?.details} />
      </Card>
      {event?._line && (
        <>
          <Card radius="md" mt="lg">
            <HighlightedText text={event._line} regex={config.regex} />
          </Card>
        </>
      )}
    </>
  );
};
