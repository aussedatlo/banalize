import { Badge, Group } from "@mantine/core";
import { IconBrandDocker, IconFile } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import Link from "next/link";
import { Config } from "types/Config";

type ConfigPaperProps = {
  config: Config;
};

export const ConfigPaper = ({ config }: ConfigPaperProps) => {
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
          <Badge size="sm" variant="dot" color="yellow">
            3 banned
          </Badge>
          <Badge size="sm" variant="dot" color="yellow">
            5 matches
          </Badge>
        </Group>
      </Paper>
    </Link>
  );
};
