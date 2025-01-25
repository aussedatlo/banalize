import { MatchFiltersDto, MatchSchema } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/matches";

export const fetchMatches = async (
  filters: MatchFiltersDto,
): Promise<{ matches: MatchSchema[]; totalCount: number }> => {
  const { data, totalCount } = await fetchFromApi<
    MatchSchema[],
    MatchFiltersDto
  >(HttpMethod.GET, ENDPOINT, filters);
  return { matches: data || [], totalCount };
};
