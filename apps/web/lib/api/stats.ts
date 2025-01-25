import {
  StatsSummaryResponse,
  StatsTimelineFiltersDto,
  StatsTimelineResponse,
} from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/stats";

export const fetchStatsSummary = async (): Promise<StatsSummaryResponse> => {
  const { data } = await fetchFromApi<StatsSummaryResponse>(
    HttpMethod.GET,
    `${ENDPOINT}/summary`,
  );
  return data;
};

export const fetchStatsTimeline = async (
  filters: StatsTimelineFiltersDto,
): Promise<StatsTimelineResponse> => {
  const { data } = await fetchFromApi<
    StatsTimelineResponse,
    StatsTimelineFiltersDto
  >(HttpMethod.GET, `${ENDPOINT}/timeline`, filters);
  return data;
};
