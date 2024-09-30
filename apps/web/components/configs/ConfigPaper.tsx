import type {
  ConfigSchema,
  StatsSummary,
  WatcherStatus,
} from "@banalize/types";
import { Badge, Group } from "@mantine/core";
import { IconBrandDocker, IconFile } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import Link from "next/link";
import { ConfigStatusBadge } from "./ConfigStatusBadge";

type ConfigPaperProps = {
  config: ConfigSchema;
  stats: StatsSummary;
  status: WatcherStatus;
};

export const ConfigPaper = ({ config, stats, status }: ConfigPaperProps) => {
  return (
    <Link href={`/configs/${config._id}`} legacyBehavior>
      <Paper
        style={{ cursor: "pointer" }}
        title={config.name}
        icon={
          config.watcherType === "docker" ? <IconBrandDocker /> : <IconFile />
        }
      >
        <Group w="100%">
          <ConfigStatusBadge status={status} />
          {stats.recentMatchesCount && (
            <Badge size="md" variant="dot" color="yellow">
              {stats.recentMatchesCount} matches
            </Badge>
          )}
          {stats.activeBansCount && (
            <Badge size="md" variant="dot" color="yellow">
              {stats.activeBansCount} bans
            </Badge>
          )}
        </Group>
      </Paper>
    </Link>
  );
};
