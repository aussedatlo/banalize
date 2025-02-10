import { EventFiltersDto, EventResponse } from "@banalize/types";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/events";

export const fetchEvents = (filters: EventFiltersDto) =>
  fetchFromApi<EventResponse[], EventFiltersDto>(
    HttpMethod.GET,
    ENDPOINT,
    filters,
  )
    .map(({ data, totalCount }) => ({ data: data || [], totalCount }))
    .orDefault({ data: [], totalCount: 0 });
