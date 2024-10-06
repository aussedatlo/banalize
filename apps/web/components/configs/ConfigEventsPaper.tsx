"use client";

import { Group, rem, Text, ThemeIcon } from "@mantine/core";
import { IconGraph, IconSearch, IconTimelineEvent } from "@tabler/icons-react";
import { TextInput } from "components/shared/Input/TextInput";
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
            w={{ base: "100%", md: "auto" }}
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
        headers={{
          type: "Event Type",
          time: "Timestamp",
          ip: "IP Address",
          details: "Details",
        }}
        items={events}
        filter={search}
      />
    </Paper>
  );
};
