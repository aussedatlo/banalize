"use client";

import { LineChart } from "@mantine/charts";
import { Grid, GridCol, Select } from "@mantine/core";
import { IconGraph } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { useState } from "react";
import { Stats } from "../../types/Stats";

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

  return (
    <LineChart
      h={300}
      data={formatData}
      dataKey="date"
      withLegend
      legendProps={{ verticalAlign: "bottom" }}
      series={[
        { name: "Matches", color: "indigo.6" },
        { name: "Bans", color: "blue.6" },
      ]}
      curveType="monotone"
    />
  );
};

export const ConfGraphPaper = (stats: ConfigGraphPaperProps) => {
  const [timeSelected, setTimeSelected] = useState("monthly");

  return (
    <Paper title="Graph" icon={<IconGraph />}>
      <Grid w="100%">
        <GridCol offset={9} span={3}>
          <Select
            onChange={(value) => setTimeSelected(value ?? "daily")}
            value={timeSelected}
            placeholder="Select time"
            data={["daily", "weekly", "monthly"]}
          />
        </GridCol>
        <GridCol span={12}>
          <StatGraph stats={stats} timeSelected={timeSelected} />
        </GridCol>
      </Grid>
    </Paper>
  );
};
