import { WatcherStatusesResponse } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/watchers";

export const fetchWatcherStatuses =
  async (): Promise<WatcherStatusesResponse> => {
    const { data } = await fetchFromApi<WatcherStatusesResponse>(
      HttpMethod.GET,
      `${ENDPOINT}/status`,
    );
    return data;
  };

export const fetchWatcherStatus = async (
  configId: string,
): Promise<WatcherStatusesResponse> => {
  const { data } = await fetchFromApi<WatcherStatusesResponse>(
    HttpMethod.GET,
    `${ENDPOINT}/status/${configId}`,
  );
  return data;
};
