"use client";

import { StatsHistoryModel } from "@banalize/api";
import { LineChart } from "@mantine/charts";
import { Grid, GridCol, Group, Select, Text, ThemeIcon } from "@mantine/core";
import { IconGraph } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { useState } from "react";

type ConfigGraphPaperProps = {
  monthly: StatsHistoryModel;
  weekly: StatsHistoryModel;
  daily: StatsHistoryModel;
};

type StatGraphProps = {
  stats: ConfigGraphPaperProps;
  period: periodString;
};

type periodString = "daily" | "weekly" | "monthly";
const isPeriodString = (value: string | null): value is periodString =>
  value !== null && ["daily", "weekly", "monthly"].includes(value);

const StatGraph = ({ stats, period }: StatGraphProps) => {
  if (!stats[period] || !stats[period].bans || !stats[period].matches) {
    return <div>No data</div>;
  }

  const bans = stats[period].bans;
  const matches = stats[period].matches;
  console.log(bans, matches);

  const formatData = Object.keys(matches.data).map((date) => ({
    date,
    Matches: matches.data[date],
    Bans: bans.data[date],
  }));
  console.log(formatData);

  const maxBanValue = Math.max(...(Object.values(bans.data) as number[]));
  const maxMatchValue = Math.max(...(Object.values(matches.data) as number[]));
  const useTwoAxis =
    maxMatchValue !== 0 &&
    (maxMatchValue / maxBanValue > 2 || maxBanValue - maxMatchValue > 100);

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

export const ConfigGraphPaper = (stats: ConfigGraphPaperProps) => {
  const [period, setPeriod] = useState<periodString>("daily");

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
            onChange={(value) => isPeriodString(value) && setPeriod(value)}
            value={period}
            placeholder="Select time"
            data={["daily", "weekly", "monthly"]}
          />
        </Group>
      }
    >
      <Grid w="100%">
        <GridCol span={12}>
          <StatGraph stats={stats} period={period} />
        </GridCol>
      </Grid>
    </Paper>
  );
};
