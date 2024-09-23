import {
  ConfigSchema,
  StatsCountModel,
  StatsCountRecordModel,
  WatcherStatusRecordModel,
} from "@banalize/api";
import { Grid, GridCol } from "@mantine/core";
import { ConfigPaper } from "components/configs/ConfigPaper";

const DEFAULT_VALUE: StatsCountModel = {
  bansCount: 0,
  matchesCount: 0,
  currentBansCount: 0,
  currentMatchesCount: 0,
};

type ConfigPaperListProps = {
  configs: ConfigSchema[];
  stats: StatsCountRecordModel;
  status: WatcherStatusRecordModel;
};

export const ConfigPaperList = ({
  configs,
  stats,
  status,
}: ConfigPaperListProps) => {
  return (
    <Grid>
      {configs.map((config) => (
        <GridCol span={{ base: 12, xs: 4 }} key={config._id}>
          <ConfigPaper
            config={config}
            stats={stats.data[config._id] ?? DEFAULT_VALUE}
            status={status.data[config._id].status ?? "unknown"}
          />
        </GridCol>
      ))}
    </Grid>
  );
};
