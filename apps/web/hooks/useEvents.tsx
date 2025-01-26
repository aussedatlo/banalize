import { EventFiltersDto } from "@banalize/types";
import { fetchEvents, fetchIpInfos } from "lib/api";
import { useMemo } from "react";
import useSWR, { mutate } from "swr";

export const useEvents = (filters: EventFiltersDto) => {
  const key = `/events/${filters.configId}/${JSON.stringify(filters)}`;
  const { data } = useSWR(key, () => fetchEvents(filters));

  return {
    events: data?.data,
    totalCount: data?.totalCount,
    mutate: () =>
      // mutate for all events with the same configId
      mutate(
        (key: string) =>
          typeof key === "string" &&
          key.startsWith(`/events/${filters.configId}`),
      ),
  };
};

export const useEventsWithIpInfos = (filters: EventFiltersDto) => {
  const { events, totalCount, mutate: mutateEvents } = useEvents(filters);

  const ips = useMemo(() => {
    return Array.from(new Set((events ?? []).map((event) => event.ip)));
  }, [events]);

  const { data: ipInfos } = useSWR(
    JSON.stringify(ips),
    () => fetchIpInfos({ ips }),
    { keepPreviousData: true },
  );

  return {
    events,
    totalCount,
    ipInfos,
    mutate: mutateEvents,
  };
};
