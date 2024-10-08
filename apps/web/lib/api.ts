import type {
  BanSchema,
  ConfigSchema,
  MatchSchema,
  StatsSummaryResponse,
  StatsTimelineResponse,
  UnbanSchema,
  WatcherStatusesResponse,
} from "@banalize/types";

const fetchFromApi = async (
  endpoint: string,
  options?: RequestInit,
  defaultValue?: object,
) => {
  console.log(
    "API request to",
    process.env.BANALIZE_WEB_API_SERVER_URL + endpoint,
  );
  try {
    const res = await fetch(
      process.env.BANALIZE_WEB_API_SERVER_URL + endpoint,
      {
        cache: "no-store",
        ...options,
      },
    );
    return await res.json();
  } catch (error) {
    console.error(error);
    return defaultValue;
  }
};

export const fetchConfigs = async (): Promise<ConfigSchema[]> => {
  return fetchFromApi("/configs", undefined, []);
};

export const fetchConfigById = async (id: string): Promise<ConfigSchema> => {
  return fetchFromApi(`/configs/${id}`);
};

export const createConfig = async (config: Omit<ConfigSchema, "_id">) => {
  return fetchFromApi("/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
};

export const updateConfig = async (config: ConfigSchema) => {
  return fetchFromApi(`/configs/${config._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
};

export const deleteConfig = async (id: string) => {
  return fetchFromApi(`/configs/${id}`, { method: "DELETE" });
};

const createQueryString = (filters: Record<string, string>): string =>
  new URLSearchParams(filters).toString();

export const fetchMatchesByConfigId = async (
  configId: string,
): Promise<MatchSchema[]> => {
  const queryString = createQueryString({ configId });
  return fetchFromApi(`/matches?${queryString}`);
};

export const fetchBansByConfigId = async (
  configId: string,
): Promise<BanSchema[]> => {
  const queryString = createQueryString({ configId });
  return fetchFromApi(`/bans?${queryString}`);
};

export const fetchUnbansByConfigId = async (
  configId: string,
): Promise<UnbanSchema[]> => {
  const queryString = createQueryString({ configId });
  return fetchFromApi(`/unbans?${queryString}`);
};

export const fetchRecentMatches = async (
  configId: string,
  timestamp_gt: number,
): Promise<MatchSchema[]> => {
  const queryString = createQueryString({
    configId,
    timestamp_gt: timestamp_gt.toString(),
  });
  return fetchFromApi(`/matches?${queryString}`);
};

export const fetchActiveBans = async (
  configId: string,
): Promise<BanSchema[]> => {
  const queryString = createQueryString({
    configId,
    active: true.toString(),
  });
  return fetchFromApi(`/bans?${queryString}`);
};

export const fetchStatsSummary = async (): Promise<StatsSummaryResponse> => {
  return fetchFromApi("/stats/summary");
};

export const fetchWatcherStatuses =
  async (): Promise<WatcherStatusesResponse> => {
    return fetchFromApi("/watchers/status");
  };

export const fetchWatcherStatus = async (
  configId: string,
): Promise<WatcherStatusesResponse> => {
  return fetchFromApi(`/watchers/status/${configId}`);
};

export const fetchStatsTimelineByConfigId = async (
  id: string,
  period: string,
): Promise<StatsTimelineResponse> => {
  return fetchFromApi(`/stats/timeline?period=${period}&configId=${id}`);
};
