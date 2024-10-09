"use client";

import { StatsTimelineResponse } from "@banalize/types";
import { LineChart } from "@mantine/charts";
import { Grid, GridCol, Group, rem, Text, ThemeIcon } from "@mantine/core";
import {
  IconCalendar,
  IconCalendarMonth,
  IconCalendarWeek,
  IconGraph,
} from "@tabler/icons-react";
import { MenuIcon } from "components/shared/Menu/MenuIcon";
import { Paper } from "components/shared/Paper/Paper";
import { useState } from "react";

type ConfigGraphPaperProps = {
  monthly: StatsTimelineResponse;
  weekly: StatsTimelineResponse;
  daily: StatsTimelineResponse;
};

type StatGraphProps = {
  stats: ConfigGraphPaperProps;
  period: Period;
};

type Period = "daily" | "weekly" | "monthly";

const StatGraph = ({ stats, period }: StatGraphProps) => {
  if (!stats[period] || !stats[period].bans || !stats[period].matches) {
    return <div>No data</div>;
  }

  const bans = stats[period].bans;
  const matches = stats[period].matches;

  const formatData = Object.keys(matches.data).map((date) => ({
    date,
    Matches: matches.data[date],
    Bans: bans.data[date],
  }));

  const maxBanValue = Math.max(...(Object.values(bans.data) as number[]));
  const maxMatchValue = Math.max(...(Object.values(matches.data) as number[]));
  const useTwoAxis =
    maxMatchValue !== 0 &&
    (maxMatchValue / maxBanValue > 2 || maxBanValue - maxMatchValue > 100);

  return (
    <LineChart
      h={{ base: 200, md: 300 }}
      data={formatData}
      dataKey="date"
      withLegend
      legendProps={{ verticalAlign: "bottom" }}
      series={[
        { name: "Matches", color: "cyan.8" },
        {
          name: "Bans",
          color: "pink.8",
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
  const [period, setPeriod] = useState<Period>("daily");

  return (
    <Paper
      override={
        <Group m="md">
          <ThemeIcon color="pink">
            <IconGraph />
          </ThemeIcon>
          <Text fz="h3">Graph</Text>
          <MenuIcon
            ml="auto"
            w={{ base: "100%", md: rem(200) }}
            onValueChange={(value: Period) => setPeriod(value)}
            data={[
              {
                label: "Daily",
                icon: (
                  <ThemeIcon color="dark" size={rem(22)}>
                    <IconCalendar style={{ width: rem(16), height: rem(16) }} />
                  </ThemeIcon>
                ),
                value: "daily",
              },
              {
                label: "Weekly",
                icon: (
                  <ThemeIcon color="dark" size={rem(22)}>
                    <IconCalendarWeek
                      style={{ width: rem(16), height: rem(16) }}
                    />
                  </ThemeIcon>
                ),
                value: "weekly",
              },
              {
                label: "Monthly",
                icon: (
                  <ThemeIcon color="dark" size={rem(22)}>
                    <IconCalendarMonth
                      style={{ width: rem(16), height: rem(16) }}
                    />
                  </ThemeIcon>
                ),
                value: "monthly",
              },
            ]}
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
