"use client";

import { ConfigSchema, EventResponse } from "@banalize/types";
import {
  Badge,
  Center,
  ComboboxItem,
  ComboboxLikeRenderOptionInput,
  Group,
  Modal,
  Pagination,
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
import { IconText } from "components/shared/Text/IconText";
import { formatDistance } from "date-fns";
import { useCallback, useState } from "react";
import { ConfigEventInformation } from "./ConfigEventInformation";

const MAX_ITEMS = 10;

type ConfigEventsPaperProps = {
  config: ConfigSchema;
  events: EventResponse[];
  totalCount: number;
};

export const ConfigEventsPaper = ({
  config,
  events: initEvents,
  totalCount: initTotalCount,
}: ConfigEventsPaperProps) => {
  const [activePage, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string[]>(["ban", "match", "unban"]);
  const [opened, { open, close }] = useDisclosure(false);
  const [events, setEvents] = useState<EventResponse[]>(initEvents);
  const [totalCount, setTotalCount] = useState(initTotalCount);
  const [focusedEvent, setFocusedEvent] = useState<EventResponse>(events[0]);
  const theme = useMantineTheme();

  const onPageChange = (page: number) => {
    setPage(page);

    fetch(`/api/events?configId=${config._id}&page=${page}&limit=${MAX_ITEMS}`)
      .then((res) => res.json())
      .then((res) => {
        setTotalCount(res.totalCount);
        setEvents(res.data);
        setFocusedEvent(res.data[0]);
      });
  };

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
    (event: EventResponse, key: "type" | "timestamp" | "ip" | "status") => {
      const badgeColor =
        event.status === "active"
          ? "pink"
          : event.status === "recent"
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
        // case "location":
        //   return <CountryText ip={event.ip} />;
        case "status":
          return (
            <Badge
              color={badgeColor}
              size="md"
              variant="filled"
              style={{ display: "block" }}
            >
              {event.status}
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
          status: "Status",
        }}
        items={events}
        onRowClick={(item) => {
          setFocusedEvent(item);
          open();
        }}
        renderRow={renderRow}
      />

      <Center>
        <Pagination
          mt="lg"
          total={Math.ceil(totalCount / MAX_ITEMS)}
          value={activePage}
          onChange={onPageChange}
          c="grey"
          color="cyan"
        />
      </Center>

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
