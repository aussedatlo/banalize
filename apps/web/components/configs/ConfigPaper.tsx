import { ConfigSchema, StatsCountModel } from "@banalize/api";
import { Badge, Group } from "@mantine/core";
import { IconBrandDocker, IconFile } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import Link from "next/link";

type ConfigPaperProps = {
  config: ConfigSchema;
  stats: StatsCountModel;
};

export const ConfigPaper = ({ config, stats }: ConfigPaperProps) => {
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
          <Badge size="sm" variant="filled" color="green">
            active
          </Badge>
          {stats.bansCount && (
            <Badge size="sm" variant="dot" color="yellow">
              {stats.bansCount} bans
            </Badge>
          )}
          {stats.matchesCount && (
            <Badge size="sm" variant="dot" color="yellow">
              {stats.matchesCount} matches
            </Badge>
          )}
        </Group>
      </Paper>
    </Link>
  );
};
