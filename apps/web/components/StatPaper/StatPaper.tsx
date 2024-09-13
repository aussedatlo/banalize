import { Paper, rem, Text } from "@mantine/core";
import classes from "./StatPaper.module.css";

type StatPaperProps = {
  stat: {
    label: string;
    value: string | number;
  };
};

export const StatPaper = ({ stat }: StatPaperProps) => {
  return (
    <Paper
      className={classes.root}
      radius="md"
      shadow="md"
      p="xs"
      key={stat.label}
    >
      <Text fz={rem(32)} className={classes.value} mt={"sm"}>
        {stat.value}
      </Text>
      <Text className={classes.label}>{stat.label}</Text>
    </Paper>
  );
};
