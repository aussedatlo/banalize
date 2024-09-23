"use client";

import { LineChart } from "@mantine/charts";
import { Grid, GridCol, Group, Select, Text, ThemeIcon } from "@mantine/core";
import { IconGraph } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { useState } from "react";
import { Stats } from "types/Stats";

type ConfigGraphPaperProps = {
  [key: string]: Stats;
};

type StatGraphProps = {
  stats: ConfigGraphPaperProps;
  timeSelected: string;
};

const StatGraph = ({ stats, timeSelected }: StatGraphProps) => {
  if (
    !stats[timeSelected] ||
    !stats[timeSelected].bans ||
    !stats[timeSelected].matches
  ) {
    return <div>No data</div>;
  }

  const bans = stats[timeSelected].bans;
  const matches = stats[timeSelected].matches;

  const formatData = Object.keys(matches.data).map((date) => ({
    date,
    Matches: matches.data[date],
    Bans: bans.data[date],
  }));

  const maxBanValue = Math.max(...Object.values(bans.data));
  const maxMatchValue = Math.max(...Object.values(matches.data));
  const useTwoAxis =
    maxMatchValue !== 0 && Math.abs(maxBanValue / maxMatchValue) > 0.5;

  console.log(useTwoAxis);
  return (
    <LineChart
      h={300}
      data={formatData}
      dataKey="date"
      withLegend
      legendProps={{ verticalAlign: "bottom" }}
      series={[
        { name: "Matches", color: "yellow.6" },
        {
          name: "Bans",
          color: "red.6",
          yAxisId: useTwoAxis ? "right" : "left",
        },
      ]}
      curveType="monotone"
      {...(useTwoAxis
        ? {
            withRightYAxis: true,
            yAxisLabel: "Matches",
            rightYAxisLabel: "Bans",
          }
        : {})}
    />
  );
};

export const ConfGraphPaper = (stats: ConfigGraphPaperProps) => {
  const [timeSelected, setTimeSelected] = useState("daily");

  return (
    <Paper
      override={
        <Group m="md">
          <ThemeIcon color="yellow">
            <IconGraph />
          </ThemeIcon>
          <Text fz="h3">Graph</Text>
          <Select
            ml="auto"
            onChange={(value) => setTimeSelected(value ?? "daily")}
            value={timeSelected}
            placeholder="Select time"
            data={["daily", "weekly", "monthly"]}
          />
        </Group>
      }
    >
      <Grid w="100%">
        <GridCol span={12}>
          <StatGraph stats={stats} timeSelected={timeSelected} />
        </GridCol>
      </Grid>
    </Paper>
  );
};
