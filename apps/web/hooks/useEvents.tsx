import { EventFiltersDto } from "@banalize/types";
import { fetchEvents, fetchIpInfos } from "lib/api";
import useSWR from "swr";

export const useEvents = (filters: EventFiltersDto) => {
  const { data } = useSWR(JSON.stringify(filters), () => fetchEvents(filters));

  return {
    events: data?.data,
    totalCount: data?.totalCount,
  };
};

export const useEventsWithIpInfos = (filters: EventFiltersDto) => {
  const { events, totalCount } = useEvents(filters);
  const ips = Array.from(new Set((events ?? []).map((event) => event.ip)));
  const { data: ipInfos } = useSWR(JSON.stringify(ips), () =>
    fetchIpInfos({ ips }),
  );

  return { events, totalCount, ipInfos };
};
