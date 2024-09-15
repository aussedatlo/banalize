import { Box, rem, Text } from "@mantine/core";
import { Card } from "components/shared/Card/Card";
import classes from "./StatPaper.module.css";

type StatPaperProps = {
  stat: {
    label: string;
    value: string | number;
  };
};

export const StatPaper = ({ stat }: StatPaperProps) => {
  return (
    <Card key={stat.label}>
      <Box className={classes.root} mb="md">
        <Text fz={rem(32)} className={classes.value}>
          {stat.value}
        </Text>
        <Text className={classes.label}>{stat.label}</Text>
      </Box>
    </Card>
  );
};
