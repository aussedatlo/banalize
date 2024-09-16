import { Grid, GridCol } from "@mantine/core";
import { ConfigPaper } from "components/configs/ConfigPaper";
import { Config } from "types/Config";

type ConfigPaperListProps = {
  configs: Config[];
};

export const ConfigPaperList = ({ configs }: ConfigPaperListProps) => {
  return (
    <Grid>
      {configs.map((config) => (
        <GridCol span={{ base: 12, xs: 4 }} key={config._id}>
          <ConfigPaper config={config} />
        </GridCol>
      ))}
    </Grid>
  );
};
