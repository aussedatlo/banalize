"use client";

import {
  ConfigSchema,
  EventResponse,
  EventStatus,
  EventType,
  IpInfosResponse,
} from "@banalize/types";
import {
  Box,
  Center,
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
  IconFilter,
  IconFilterOff,
  IconGraph,
  IconSearch,
  IconTimelineEvent,
} from "@tabler/icons-react";
import { StatusBadge } from "components/shared/Badge/StatusBadge";
import { EventIcon } from "components/shared/Icon/EventIcon";
import { MultiSelectInput } from "components/shared/Input/MultiSelectInput";
import { TextInput } from "components/shared/Input/TextInput";
import { Paper } from "components/shared/Paper/Paper";
import { Table } from "components/shared/Table/Table";
import { IconText } from "components/shared/Text/IconText";
import { formatDistance } from "date-fns";
import { useEventsWithIpInfos } from "hooks/useEvents";
import { useCallback, useEffect, useState } from "react";
import { ConfigEventInformation } from "./ConfigEventInformation";

const MAX_ITEMS = 10;

type ConfigEventsPaperProps = {
  config: ConfigSchema;
  events: EventResponse[];
  totalCount: number;
  ipInfos: Record<string, Partial<IpInfosResponse>>;
  ipFilter?: string;
};

export const ConfigEventsPaper = ({
  config,
  events: initEvents,
  totalCount: initTotalCount,
  ipInfos: initIpInfos,
  ipFilter: initIpFilter,
}: ConfigEventsPaperProps) => {
  const [activePage, setPage] = useState(1);
  const [ipFilter, setIpFilter] = useState(initIpFilter ?? "");
  const [typeFilter, setTypeFilter] = useState<EventType[]>([
    EventType.BAN,
    EventType.MATCH,
    EventType.UNBAN,
  ]);
  const [statusFilter, setStatusFilter] = useState<EventStatus[]>([
    EventStatus.RECENT,
    EventStatus.STALE,
    EventStatus.ACTIVE,
    EventStatus.EXPIRED,
    EventStatus.UNBANNED,
    EventStatus.IGNORED,
  ]);
  const [opened, { open, close }] = useDisclosure(false);
  const [state, setState] = useState({
    events: initEvents,
    totalCount: initTotalCount,
    ipInfos: initIpInfos,
  });
  const [focusedEvent, setFocusedEvent] = useState<EventResponse>(
    state.events?.[0],
  );
  const theme = useMantineTheme();

  const { events, totalCount, ipInfos } = useEventsWithIpInfos({
    configId: config._id,
    page: activePage,
    limit: MAX_ITEMS,
    type: typeFilter,
    status: statusFilter,
    ip: ipFilter,
  });

  useEffect(() => {
    if (!events || totalCount === undefined || !ipInfos) return;
    setState({ events, totalCount, ipInfos });
  }, [events, ipInfos, totalCount]);

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
            <Text fz="sm">
              {state.ipInfos[event.ip]?.country?.flag}{" "}
              {state.ipInfos[event.ip]?.country?.name}
            </Text>
          );
        case "status":
          return <StatusBadge status={event.status} />;
        default:
          break;
      }
    },
    [state.ipInfos],
  );

  return (
    <Paper
      icon={<IconTimelineEvent />}
      override={
        <Group m="md" justify="space-between">
          <Group>
            <ThemeIcon color="pink">
              <IconGraph />
            </ThemeIcon>
            <Text fz="h3">
              {initIpFilter ? `Events for ${ipFilter}` : "Events"}
            </Text>
          </Group>

          <Group>
            <MultiSelectInput
              data={[
                { value: EventType.BAN, label: "Bans" },
                {
                  value: EventType.MATCH,
                  label: "Matches",
                },
                { value: EventType.UNBAN, label: "Unbans" },
              ]}
              value={typeFilter}
              onChange={(e) => setTypeFilter(e as EventType[])}
              w={{ base: "100%", md: rem(200) }}
              placeholder="Event Type"
              renderOption={(item) => (
                <IconText
                  text={item.option.value}
                  icon={<EventIcon type={item.option.value as EventType} />}
                  textProps={{ style: { textTransform: "capitalize" } }}
                />
              )}
              leftSection={
                typeFilter.length === 3 ? (
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
            <MultiSelectInput
              data={[
                { value: EventStatus.ACTIVE, label: "Active" },
                { value: EventStatus.EXPIRED, label: "Expired" },
                { value: EventStatus.RECENT, label: "Recent" },
                { value: EventStatus.STALE, label: "Stale" },
                { value: EventStatus.UNBANNED, label: "Unbanned" },
                { value: EventStatus.IGNORED, label: "Ignored" },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e as EventStatus[])}
              w={{ base: "100%", md: rem(200) }}
              placeholder="Event Status"
              renderOption={(item) => (
                <Box>
                  <StatusBadge status={item.option.value as EventStatus} />
                </Box>
              )}
              leftSection={
                statusFilter.length === 5 ? (
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
            {!initIpFilter && (
              <TextInput
                ml="auto"
                placeholder="Search by IP"
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
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
              />
            )}
          </Group>
        </Group>
      }
    >
      <Table
        headers={
          initIpFilter
            ? {
                type: "Event Type",
                timestamp: "Timestamp",
                location: "Location",
                status: "Status",
              }
            : {
                type: "Event Type",
                timestamp: "Timestamp",
                ip: "IP Address",
                location: "Location",
                status: "Status",
              }
        }
        items={state.events}
        onRowClick={(item) => {
          setFocusedEvent(item);
          open();
        }}
        renderRow={renderRow}
      />

      <Center>
        <Pagination
          mt="lg"
          total={Math.ceil(state.totalCount / MAX_ITEMS)}
          value={activePage}
          onChange={setPage}
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
          ipInfos={state.ipInfos?.[focusedEvent?.ip]}
        />
      </Modal>
    </Paper>
  );
};
