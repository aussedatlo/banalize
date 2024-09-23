import { ConfigSchema } from "@banalize/api";
import { Group, Text } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";

type ConfigInfoPaperProps = {
  config: ConfigSchema;
};

export const ConfigInfoPaper = ({ config }: ConfigInfoPaperProps) => {
  const items = [
    { text: "Regex", value: config.regex },
    { text: "Param", value: config.param },
    { text: "Ban time", value: `${config.banTime} sec` },
    { text: "Find time", value: `${config.findTime} sec` },
    { text: "Max matches", value: config.maxMatches },
    { text: "Watcher type", value: config.watcherType },
    {
      text: "Ignored Ips",
      value: config.ignoreIps.length ? config.ignoreIps.join(", ") : "None",
    },
  ];
  return (
    <Paper title="Informations" icon={<IconInfoCircle />} h={265}>
      {items.map((item, index) => (
        <Group justify="space-between" w="100%" key={`${index}-stat`}>
          <Text>{item.text}:</Text>
          <Text size="sm">{item.value}</Text>
        </Group>
      ))}
    </Paper>
  );
};
