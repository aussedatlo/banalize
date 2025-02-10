import {
  StatsSummaryResponse,
  StatsTimelineFiltersDto,
  StatsTimelineResponse,
} from "@banalize/types";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/stats";

export const fetchStatsSummary = (): Promise<StatsSummaryResponse> =>
  fetchFromApi<StatsSummaryResponse>(HttpMethod.GET, `${ENDPOINT}/summary`)
    .map(({ data }) => data)
    .orDefault({ data: {} });

export const fetchStatsTimeline = (
  filters: StatsTimelineFiltersDto,
): Promise<StatsTimelineResponse> =>
  fetchFromApi<StatsTimelineResponse, StatsTimelineFiltersDto>(
    HttpMethod.GET,
    `${ENDPOINT}/timeline`,
    filters,
  )
    .map(({ data }) => data)
    .orDefault({ bans: { data: {} }, matches: { data: {} } });
