import type { ConfigSchema, StatsSummary } from "@banalize/types";
import { Badge, Group } from "@mantine/core";
import { IconBrandDocker, IconFile } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import Link from "next/link";

type ConfigPaperProps = {
  config: ConfigSchema;
  stats: StatsSummary;
  status: string;
};

export const ConfigPaper = ({ config, stats, status }: ConfigPaperProps) => {
  return (
    <Link href={`/configs/${config._id}`} legacyBehavior>
      <Paper
        style={{ cursor: "pointer" }}
        title={config.param}
        icon={
          config.watcherType === "docker" ? <IconBrandDocker /> : <IconFile />
        }
      >
        <Group w="100%">
          <Badge
            size="sm"
            variant="filled"
            color={
              status === "running"
                ? "green"
                : status === "error"
                  ? "red"
                  : "yellow"
            }
          >
            {status}
          </Badge>
          {stats.recentMatchesCount && (
            <Badge size="sm" variant="dot" color="yellow">
              {stats.recentMatchesCount} matches
            </Badge>
          )}
          {stats.activeBansCount && (
            <Badge size="sm" variant="dot" color="yellow">
              {stats.activeBansCount} bans
            </Badge>
          )}
        </Group>
      </Paper>
    </Link>
  );
};
