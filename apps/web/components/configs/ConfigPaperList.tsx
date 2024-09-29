import {
  ConfigSchema,
  StatsSummary,
  StatsSummaryResponse,
  WatcherStatusesResponse,
} from "@banalize/types";
import { Grid, GridCol } from "@mantine/core";
import { ConfigPaper } from "components/configs/ConfigPaper";

const DEFAULT_VALUE: StatsSummary = {
  allBansCount: 0,
  allMatchesCount: 0,
  recentMatchesCount: 0,
  activeBansCount: 0,
};

type ConfigPaperListProps = {
  configs: ConfigSchema[];
  stats: StatsSummaryResponse;
  statuses: WatcherStatusesResponse;
};

export const ConfigPaperList = ({
  configs,
  stats,
  statuses,
}: ConfigPaperListProps) => {
  return (
    <Grid>
      {configs.map((config) => (
        <GridCol span={{ base: 12, xs: 4 }} key={config._id}>
          <ConfigPaper
            config={config}
            stats={stats.data[config._id] ?? DEFAULT_VALUE}
            status={statuses.data[config._id].status ?? "unknown"}
          />
        </GridCol>
      ))}
    </Grid>
  );
};
