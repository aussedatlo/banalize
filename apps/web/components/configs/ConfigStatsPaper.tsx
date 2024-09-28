import { Grid, GridCol, rem, Text, Tooltip } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { Card } from "components/shared/Card/Card";
import { Paper } from "components/shared/Paper/Paper";
import classes from "./ConfigStatsPaper.module.css";

type StatCardProps = {
  text: string;
  value: string;
  help?: string;
};

const StatCard = ({ text, value, help }: StatCardProps) => {
  return (
    <Card style={{ position: "relative" }}>
      <Tooltip
        label={help}
        withArrow
        transitionProps={{ transition: "pop-bottom-right" }}
      >
        <Text
          component="div"
          c="dimmed"
          style={{ cursor: "help" }}
          className={classes.tooltip}
        >
          <IconInfoCircle
            style={{ width: rem(22), height: rem(22) }}
            stroke={1}
          />
        </Text>
      </Tooltip>
      <Text className={classes.value} fz="h1" mt="xs">
        {value}
      </Text>
      <Text className={classes.text} mb="xs">
        {text}
      </Text>
    </Card>
  );
};

type ConfigStatsPaperProps = {
  items: StatCardProps[];
  title: string;
  icon: React.ReactNode;
};

export const ConfigStatsPaper = ({
  items,
  title,
  icon,
}: ConfigStatsPaperProps) => {
  return (
    <Paper title={title} icon={icon}>
      <Grid w="100%">
        {items.map((item, index) => (
          <GridCol span={{ base: 12 / items.length }} key={`${index}-stat`}>
            <StatCard {...item} />
          </GridCol>
        ))}
      </Grid>
    </Paper>
  );
};
