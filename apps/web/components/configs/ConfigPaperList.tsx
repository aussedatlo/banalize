import { StatsCountCollection } from "@banalize/api/src/stats/entities/StatsCurrentCollection";
import { Grid, GridCol } from "@mantine/core";
import { ConfigPaper } from "components/configs/ConfigPaper";
import { Config } from "types/Config";

type ConfigPaperListProps = {
  configs: Config[];
  stats: StatsCountCollection;
};

export const ConfigPaperList = ({ configs, stats }: ConfigPaperListProps) => {
  return (
    <Grid>
      {configs.map((config) => (
        <GridCol span={{ base: 12, xs: 4 }} key={config._id}>
          <ConfigPaper config={config} stats={stats.data[config._id]} />
        </GridCol>
      ))}
    </Grid>
  );
};
