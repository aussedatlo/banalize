import { EventFiltersDto, EventResponse } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/events";

export const fetchEvents = async (
  filters: EventFiltersDto,
): Promise<{ data: EventResponse[]; totalCount: number }> => {
  const { data, totalCount } = await fetchFromApi<
    EventResponse[],
    EventFiltersDto
  >(HttpMethod.GET, ENDPOINT, filters);
  return { data: data || [], totalCount };
};
