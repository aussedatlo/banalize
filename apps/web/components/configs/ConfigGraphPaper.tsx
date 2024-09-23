"use client";

import { LineChart } from "@mantine/charts";
import { Grid, GridCol, Select } from "@mantine/core";
import { IconGraph } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { useEffect, useState } from "react";
import { fetchStatsByConfigId } from "../../lib/api";
import { Stats } from "../../types/Stats";

type ConfigGraphPaperProps = {
  configId: string;
};

const StatGraph = ({ bans, matches }: Stats) => {
  if (!bans || !matches) {
    return <div>No data</div>;
  }

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
      curveType="natural"
    />
  );
};

export const ConfGraphPaper = ({ configId }: ConfigGraphPaperProps) => {
  const [timeSelected, setTimeSelected] = useState<string | null>("daily");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchStatsByConfigId(configId, timeSelected).then((res) => {
      setStats(res);
    });
  }, [configId, timeSelected]);

  return (
    <Paper title="Graph" icon={<IconGraph />}>
      <Grid w="100%">
        <GridCol offset={9} span={3}>
          <Select
            onChange={(value) => setTimeSelected(value)}
            value={timeSelected}
            placeholder="Select time"
            data={["daily", "weekly", "monthly"]}
          />
        </GridCol>
        <GridCol span={12}>
          <StatGraph bans={stats?.bans} matches={stats?.bans} />
        </GridCol>
      </Grid>
    </Paper>
  );
};
