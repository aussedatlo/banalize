import type {
  BanSchema,
  ConfigSchema,
  EventFiltersDto,
  EventResponse,
  IpInfosResponse,
  MatchSchema,
  StatsSummaryResponse,
  StatsTimelineResponse,
  UnbanSchema,
  WatcherStatusesResponse,
} from "@banalize/types";

export const fetchFromApi = async <T extends object>(
  endpoint: string,
  options?: RequestInit,
  defaultValue?: object,
): Promise<[T, number]> => {
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
    return [
      (await res.json()) as T,
      Number(res.headers.get("x-total-count")) || 0,
    ];
  } catch (error) {
    console.error(error);
    return [defaultValue as T, 0];
  }
};

export const fetchConfigs = async (): Promise<ConfigSchema[]> => {
  const [data] = await fetchFromApi<ConfigSchema[]>("/configs", undefined, []);
  return data;
};

export const fetchConfigById = async (id: string): Promise<ConfigSchema> => {
  const [data] = await fetchFromApi<ConfigSchema>(`/configs/${id}`);
  return data;
};

export const createConfig = async (
  config: Omit<ConfigSchema, "_id">,
): Promise<ConfigSchema> => {
  const [data] = await fetchFromApi<ConfigSchema>("/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return data;
};

export const updateConfig = async (
  config: ConfigSchema,
): Promise<ConfigSchema> => {
  const [data] = await fetchFromApi<ConfigSchema>(`/configs/${config._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return data;
};

export const deleteConfig = async (id: string) => {
  fetchFromApi(`/configs/${id}`, { method: "DELETE" });
};

const createQueryString = (filters: Record<string, string>): string =>
  new URLSearchParams(filters).toString();

export const fetchMatchesByConfigId = async (
  configId: string,
): Promise<MatchSchema[]> => {
  const queryString = createQueryString({ configId });
  const [data] = await fetchFromApi<MatchSchema[]>(`/matches?${queryString}`);
  return data;
};

export const fetchBansByConfigId = async (
  configId: string,
): Promise<BanSchema[]> => {
  const queryString = createQueryString({ configId });
  const [data] = await fetchFromApi<BanSchema[]>(`/bans?${queryString}`);
  return data;
};

export const fetchUnbansByConfigId = async (
  configId: string,
): Promise<UnbanSchema[]> => {
  const queryString = createQueryString({ configId });
  const [data] = await fetchFromApi<UnbanSchema[]>(`/unbans?${queryString}`);
  return data;
};

export const fetchRecentMatches = async (
  configId: string,
  timestamp_gt: number,
): Promise<MatchSchema[]> => {
  const queryString = createQueryString({
    configId,
    timestamp_gt: timestamp_gt.toString(),
  });
  const [data] = await fetchFromApi<MatchSchema[]>(`/matches?${queryString}`);
  return data;
};

export const fetchActiveBans = async (
  configId: string,
): Promise<BanSchema[]> => {
  const queryString = createQueryString({
    configId,
    active: true.toString(),
  });
  const [data] = await fetchFromApi<BanSchema[]>(`/bans?${queryString}`);
  return data;
};

export const fetchStatsSummary = async (): Promise<StatsSummaryResponse> => {
  const [data] = await fetchFromApi<StatsSummaryResponse>("/stats/summary");
  return data;
};

export const fetchWatcherStatuses =
  async (): Promise<WatcherStatusesResponse> => {
    const [data] =
      await fetchFromApi<WatcherStatusesResponse>("/watchers/status");
    return data;
  };

export const fetchWatcherStatus = async (
  configId: string,
): Promise<WatcherStatusesResponse> => {
  const [data] = await fetchFromApi<WatcherStatusesResponse>(
    `/watchers/status/${configId}`,
  );
  return data;
};

export const fetchStatsTimelineByConfigId = async (
  id: string,
  period: string,
): Promise<StatsTimelineResponse> => {
  const [data] = await fetchFromApi<StatsTimelineResponse>(
    `/stats/timeline?period=${period}&configId=${id}`,
  );
  return data;
};

export const fetchIpInfos = async (
  ip: string,
): Promise<Partial<IpInfosResponse>> => {
  const [data] = await fetchFromApi<Partial<IpInfosResponse>>(
    `/ip-infos/${ip}`,
  );
  return data;
};

type QueryParams = {
  [key: string]: string | number | string[] | undefined;
};

const createQueryStringFromObject = (params: QueryParams): string => {
  return Object.entries(params)
    .filter(
      ([_, value]) => value !== undefined && value !== null && value !== "",
    ) // Exclude undefined, null, and empty string values
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array of values, such as ['a', 'b'] => 'key=a,b'
        return `${encodeURIComponent(key)}=${encodeURIComponent(value.join(","))}`;
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
    })
    .join("&");
};

export const fetchEvents = async (
  filters: EventFiltersDto,
): Promise<{ data: EventResponse[]; totalCount: number }> => {
  const queryString = createQueryStringFromObject(filters);
  const [data, totalCount] = await fetchFromApi<EventResponse[]>(
    `/events?${queryString}`,
  );
  return { data, totalCount };
};
