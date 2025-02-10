import { MatchFiltersDto, MatchSchema } from "@banalize/types";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/matches";

export const fetchMatches = (
  filters: MatchFiltersDto,
): Promise<{ matches: MatchSchema[]; totalCount: number }> =>
  fetchFromApi<MatchSchema[], MatchFiltersDto>(
    HttpMethod.GET,
    ENDPOINT,
    filters,
  )
    .map(({ data, totalCount }) => ({ matches: data || [], totalCount }))
    .orDefault({ matches: [], totalCount: 0 });
