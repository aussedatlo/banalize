import { IpInfosFiltersDto, IpInfosResponse } from "@banalize/types";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/ip-infos";

export const fetchIpInfos = (
  filters: IpInfosFiltersDto,
): Promise<Record<string, Partial<IpInfosResponse>>> =>
  fetchFromApi<Record<string, Partial<IpInfosResponse>>, IpInfosFiltersDto>(
    HttpMethod.GET,
    ENDPOINT,
    filters,
  )
    .map(({ data }) => ({ data }))
    .orDefault({ data: {} });
