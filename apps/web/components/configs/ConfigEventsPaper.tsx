"use client";

import {
  ConfigSchema,
  EventResponse,
  EventType,
  IpInfosResponse,
} from "@banalize/types";
import {
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
  IconGraph,
  IconSearch,
  IconTimelineEvent,
} from "@tabler/icons-react";
import { StatusBadge } from "components/shared/Badge/StatusBadge";
import { EventIcon } from "components/shared/Icon/EventIcon";
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
  ipInfos: Record<string, Partial<IpInfosResponse>>;
};

export const ConfigEventsPaper = ({
  config,
  events: initEvents,
  totalCount: initTotalCount,
  ipInfos: initIpInfos,
}: ConfigEventsPaperProps) => {
  const [activePage, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string[]>(["ban", "match", "unban"]);
  const [opened, { open, close }] = useDisclosure(false);
  const [events, setEvents] = useState<EventResponse[]>(initEvents);
  const [ipInfos, setIpInfos] =
    useState<Record<string, Partial<IpInfosResponse>>>(initIpInfos);
  const [totalCount, setTotalCount] = useState(initTotalCount);
  const [focusedEvent, setFocusedEvent] = useState<EventResponse>(events[0]);
  const theme = useMantineTheme();

  const onPageChange = (page: number) => {
    setPage(page);

    fetch(`/api/events?configId=${config._id}&page=${page}&limit=${MAX_ITEMS}`)
      .then((res) => res.json())
      .then(({ data, totalCount }) => {
        const ipList = Array.from(
          new Set(data.map((event: EventResponse) => event.ip)),
        );

        fetch(`/api/ip-infos?ips=${ipList.join(",")}`)
          .then((res) => res.json())
          .then((res) => {
            setIpInfos((prev) => ({ ...prev, ...res }));
            setEvents(data);
            setTotalCount(totalCount);
            setFocusedEvent(data[0]);
          });
      });
  };

  const renderRow = useCallback(
    (
      event: EventResponse,
      key: "type" | "timestamp" | "ip" | "status" | "location",
    ) => {
      switch (key) {
        case "type":
          return (
            <IconText
              text={event.type}
              icon={<EventIcon type={event.type} />}
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
          return (
            <Group gap="xs">
              <Text>{ipInfos[event.ip]?.country?.flag}</Text>
              <Text>{ipInfos[event.ip]?.country?.name}</Text>
            </Group>
          );
        case "status":
          return <StatusBadge status={event.status} />;
        default:
          break;
      }
    },
    [ipInfos],
  );

  const renderOption = (item: ComboboxLikeRenderOptionInput<ComboboxItem>) => (
    <Group justify="space-between" w="100%">
      <Group>
        <IconText
          text={item.option.value}
          icon={<EventIcon type={item.option.value as EventType} />}
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
        <ConfigEventInformation
          event={focusedEvent}
          config={config}
          ipInfos={ipInfos[focusedEvent.ip]}
        />
      </Modal>
    </Paper>
  );
};
