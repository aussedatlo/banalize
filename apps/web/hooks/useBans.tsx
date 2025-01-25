import { BanFiltersDto } from "@banalize/types";
import { fetchBans } from "lib/api";
import useSWR from "swr";

export const useBans = (filters: BanFiltersDto) => {
  const { data } = useSWR(JSON.stringify(filters), () => fetchBans(filters));

  return {
    bans: data?.bans,
    totalCount: data?.totalCount,
  };
};
