import { Grid } from "@mantine/core";
import { ConfigPaper } from "components/configs/ConfigPaper/ConfigPaper";
import { Config } from "types/Config";

type ConfigListProps = {
  configs: Config[];
};

export const ConfigList = ({ configs }: ConfigListProps) => {
  return (
    <Grid mt={"lg"}>
      {configs.map((config: Config) => (
        <Grid.Col span={{ base: 12, xs: 4 }} key={config._id}>
          <ConfigPaper config={config} />
        </Grid.Col>
      ))}
    </Grid>
  );
};
