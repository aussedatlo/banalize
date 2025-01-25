import { BanFiltersDto, BanSchema } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/bans";

export const fetchBans = async (
  filters: BanFiltersDto,
): Promise<{ bans: BanSchema[]; totalCount: number }> => {
  const { data, totalCount } = await fetchFromApi<BanSchema[], BanFiltersDto>(
    HttpMethod.GET,
    ENDPOINT,
    filters,
  );
  return { bans: data || [], totalCount };
};
