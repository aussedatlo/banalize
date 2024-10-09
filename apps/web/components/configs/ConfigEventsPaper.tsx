"use client";

import { ConfigSchema } from "@banalize/types";
import {
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  Modal,
  rem,
  Text,
  ThemeIcon,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCheck,
  IconFilter,
  IconFilterOff,
  IconFlag,
  IconGraph,
  IconHandOff,
  IconHandStop,
  IconSearch,
  IconTimelineEvent,
} from "@tabler/icons-react";
import { MultiSelect } from "components/shared/Input/MultiSelect";
import { TextInput } from "components/shared/Input/TextInput";
import { Paper } from "components/shared/Paper/Paper";
import { Table } from "components/shared/Table/Table";
import { Event } from "lib/events";
import { useMemo, useState } from "react";
import { ConfigEventInformation } from "./ConfigEventInformation";

type ConfigEventsPaperProps = {
  config: ConfigSchema;
  events: Event[];
};

export const ConfigEventsPaper = ({
  config,
  events,
}: ConfigEventsPaperProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string[]>(["ban", "match", "unban"]);
  const [opened, { open, close }] = useDisclosure(false);
  const [focusedEvent, setFocusedEvent] = useState<Event>();
  const theme = useMantineTheme();

  const filteredEvents = useMemo(() => {
    return events.filter((event) => filter.includes(event._type));
  }, [events, filter]);

  const renderOption = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => (
    <Group justify="space-between" w="100%">
      <Group>
        <ThemeIcon color="dark" size={rem(22)}>
          {(() => {
            switch (item.option.value) {
              case "ban":
                return (
                  <IconHandStop style={{ width: rem(16), height: rem(16) }} />
                );
              case "match":
                return <IconFlag style={{ width: rem(16), height: rem(16) }} />;
              case "unban":
                return (
                  <IconHandOff style={{ width: rem(16), height: rem(16) }} />
                );
              default:
                return null;
            }
          })()}
        </ThemeIcon>
        <Text fz="sm">{item.option.label}</Text>
      </Group>

      {item.checked && (
        <IconCheck
          style={{
            width: rem(16),
            height: rem(16),
          }}
        />
      )}
    </Group>
  );

  return (
    <Paper
      title="Events"
      icon={<IconTimelineEvent />}
      override={
        <Group m="md" justify="space-between">
          <Group>
            <ThemeIcon color="pink">
              <IconGraph />
            </ThemeIcon>
            <Text fz="h3">Events</Text>
          </Group>

          <Group>
            <MultiSelect
              data={[
                { value: "ban", label: "Bans" },
                {
                  value: "match",
                  label: "Matches",
                },
                { value: "unban", label: "Unbans" },
              ]}
              value={filter}
              onChange={(e) => setFilter(e)}
              w={{ base: "100%", md: rem(200) }}
              placeholder="Event Type"
              renderOption={renderOption}
              leftSection={
                filter.length === 3 ? (
                  <IconFilterOff
                    style={{
                      width: rem(16),
                      height: rem(16),
                      color: theme.colors.pink[8],
                    }}
                  />
                ) : (
                  <IconFilter
                    style={{
                      width: rem(16),
                      height: rem(16),
                      color: theme.colors.pink[8],
                    }}
                  />
                )
              }
            />
            <TextInput
              ml="auto"
              placeholder="Search by any field"
              w={{ base: "100%", md: "auto" }}
              leftSection={
                <IconSearch
                  style={{
                    width: rem(16),
                    height: rem(16),
                    color: theme.colors.pink[8],
                  }}
                />
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Group>
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
        items={filteredEvents}
        filter={search}
        onRowClick={(item) => {
          setFocusedEvent(item);
          open();
        }}
      />

      <Modal
        opened={opened}
        onClose={close}
        title={`Event Information`}
        centered
      >
        <ConfigEventInformation event={focusedEvent} config={config} />
      </Modal>
    </Paper>
  );
};
