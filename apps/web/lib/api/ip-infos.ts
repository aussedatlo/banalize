import { IpInfosFiltersDto, IpInfosResponse } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/ip-infos";

export const fetchIpInfos = async (
  filters: IpInfosFiltersDto,
): Promise<Record<string, Partial<IpInfosResponse>>> => {
  if (filters.ips.length === 0) {
    return {};
  }

  const { data } = await fetchFromApi<
    Record<string, Partial<IpInfosResponse>>,
    IpInfosFiltersDto
  >(HttpMethod.GET, ENDPOINT, filters);
  return data;
};
