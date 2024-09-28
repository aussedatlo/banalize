"use client";

import { Group, rem, Text, TextInput, ThemeIcon } from "@mantine/core";
import { IconGraph, IconSearch, IconTimelineEvent } from "@tabler/icons-react";
import { Paper } from "components/shared/Paper/Paper";
import { Table } from "components/shared/Table/Table";
import { Event } from "lib/events";
import { useState } from "react";

type ConfigEventsPaperProps = {
  events: Event[];
};

export const ConfigEventsPaper = ({ events }: ConfigEventsPaperProps) => {
  const [search, setSearch] = useState("");

  return (
    <Paper
      title="Events"
      icon={<IconTimelineEvent />}
      override={
        <Group m="md">
          <ThemeIcon color="yellow">
            <IconGraph />
          </ThemeIcon>
          <Text fz="h3">Events</Text>
          <TextInput
            ml="auto"
            placeholder="Search by any field"
            leftSection={
              <IconSearch
                style={{ width: rem(16), height: rem(16) }}
                stroke={1.5}
              />
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Group>
      }
    >
      <Table
        headers={["type", "time", "ip", "line"]}
        items={events}
        filter={search}
        widths={[10, 15, 10, 65]}
      />
    </Paper>
  );
};
