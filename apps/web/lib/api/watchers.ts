import { WatcherStatusesResponse } from "@banalize/types";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/watchers";

export const fetchWatcherStatuses =
  async (): Promise<WatcherStatusesResponse> =>
    fetchFromApi<WatcherStatusesResponse>(HttpMethod.GET, `${ENDPOINT}/status`)
      .map(({ data }) => data)
      .orDefault({ data: {} });

export const fetchWatcherStatus = (
  configId: string,
): Promise<WatcherStatusesResponse> =>
  fetchFromApi<WatcherStatusesResponse>(
    HttpMethod.GET,
    `${ENDPOINT}/status/${configId}`,
  )
    .map(({ data }) => data)
    .orDefault({ data: {} });
