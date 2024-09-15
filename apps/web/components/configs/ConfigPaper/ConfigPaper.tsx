import { Divider, Group, Text, ThemeIcon } from "@mantine/core";
import { IconArrowRight, IconBrandDocker, IconFile } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/ContainerPaper";
import { StatPaper } from "components/shared/StatPaper/StatPaper";
import Link from "next/link";
import { Config } from "types/Config";
import classes from "./ConfigPaper.module.css";

type ConfigPaperProps = {
  config: Config;
};

export const ConfigPaper = ({ config }: ConfigPaperProps) => {
  return (
    <Paper>
      <Group justify="space-between">
        <Group>
          <ThemeIcon size={40} radius={15} color="yellow">
            {config.watcherType === "docker" ? (
              <IconBrandDocker />
            ) : (
              <IconFile />
            )}
          </ThemeIcon>

          <div>
            <Text fw={700} className={classes.title}>
              {config.param}
            </Text>
            <Text c="dimmed" fz="sm">
              {config.regex}
            </Text>
          </div>
        </Group>

        <Link href={`/configs/${config._id}`}>
          <IconArrowRight />
        </Link>
      </Group>

      <Divider mt="md" />

      <Group justify="space-between" mt="md">
        <StatPaper stat={{ label: "Matches", value: "3" }} />
        <StatPaper stat={{ label: "Bans", value: "5" }} />
      </Group>
    </Paper>
  );
};
