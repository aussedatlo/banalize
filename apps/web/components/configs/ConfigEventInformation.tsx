import { extractIp } from "@banalize/shared-utils";
import { ConfigSchema } from "@banalize/types";
import {
  Box,
  BoxProps,
  Card,
  Divider,
  Group,
  rem,
  rgba,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { Event } from "lib/events";

type HighlightedTextProps = {
  text: string;
  regex: string;
};

const HighlightedText = ({ text, regex }: HighlightedTextProps) => {
  const theme = useMantineTheme();
  const result = extractIp(regex, text);

  if (!result || result.length !== 5)
    return <Text component="span">{text}</Text>;

  return (
    <Box display="inline">
      <Text component="span">{result[0]}</Text>
      <Text component="span" bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result[1]}
      </Text>
      <Text component="span" bg="cyan">
        {result[2]}
      </Text>
      <Text component="span" bg={rgba(theme.colors.cyan[6], 0.2)}>
        {result[3]}
      </Text>
      <Text component="span">{result[4]}</Text>
    </Box>
  );
};

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
