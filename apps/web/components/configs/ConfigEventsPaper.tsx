"use client";

import { ConfigSchema } from "@banalize/types";
import {
  Badge,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  Modal,
  rem,
  Text,
  ThemeIcon,
  Tooltip,
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
import { CountryText } from "components/shared/Text/CountryText";
import { IconText } from "components/shared/Text/IconText";
import { formatDistance } from "date-fns";
import { type Event } from "lib/events";
import { useCallback, useMemo, useState } from "react";
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
  const [focusedEvent, setFocusedEvent] = useState<Event>(events[0]);
  const theme = useMantineTheme();

  const filteredEvents: Event[] = useMemo(() => {
    return events
      .filter((event) => filter.includes(event.type))
      .filter((event) => {
        if (search === "") return true;
        return JSON.stringify(event).includes(search);
      });
  }, [events, filter, search]);

  const renderIcon = useCallback((type: string) => {
    const iconProps = { style: { width: rem(16), height: rem(16) } };
    switch (type) {
      case "ban":
        return <IconHandStop {...iconProps} />;
      case "match":
        return <IconFlag {...iconProps} />;
      case "unban":
        return <IconHandOff {...iconProps} />;
      default:
        return null;
    }
  }, []);

  const renderRow = useCallback(
    (
      event: Event,
      key: "type" | "timestamp" | "ip" | "details" | "location",
    ) => {
      const badgeColor =
        event.details === "active"
          ? "pink"
          : event.details === "recent"
            ? "cyan"
            : "dark";
      switch (key) {
        case "type":
          return (
            <IconText
              text={event.type}
              icon={renderIcon(event.type)}
              textProps={{ style: { textTransform: "capitalize" } }}
            />
          );
        case "timestamp":
          return (
            <Tooltip
              label={new Date(event.timestamp).toLocaleString()}
              withArrow
            >
              <Text fz="sm">
                {formatDistance(new Date(event.timestamp), new Date(), {
                  addSuffix: true,
                })}
              </Text>
            </Tooltip>
          );
        case "ip":
          return <>{event.ip}</>;
        case "location":
          return <CountryText ip={event.ip} />;
        case "details":
          return (
            <Badge
              color={badgeColor}
              size="md"
              variant="filled"
              style={{ display: "block" }}
            >
              {event.details}
            </Badge>
          );
        default:
          break;
      }
    },
    [renderIcon],
  );

  const renderOption = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => (
    <Group justify="space-between" w="100%">
      <Group>
        <IconText
          text={item.option.value}
          icon={renderIcon(item.option.value)}
          textProps={{ style: { textTransform: "capitalize" } }}
        />
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
          timestamp: "Timestamp",
          ip: "IP Address",
          location: "Location",
          details: "Details",
        }}
        items={filteredEvents}
        onRowClick={(item) => {
          setFocusedEvent(item);
          open();
        }}
        renderRow={renderRow}
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
