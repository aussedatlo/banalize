import type {
  BanFiltersDto,
  BanSchema,
  ConfigSchema,
  EventFiltersDto,
  EventResponse,
  IpInfosFiltersDto,
  IpInfosResponse,
  MatchFiltersDto,
  MatchSchema,
  StatsSummaryResponse,
  StatsTimelineFiltersDto,
  StatsTimelineResponse,
  UnbanSchema,
  WatcherStatusesResponse,
} from "@banalize/types";

const API_BASE_URL = process.env.BANALIZE_WEB_API_SERVER_URL;

if (!API_BASE_URL) {
  throw new Error("BANALIZE_WEB_API_SERVER_URL is not defined");
}

// Types
type QueryParams =
  | {
      [key: string]: string | number | string[] | undefined;
    }
  | object;

export const fetchFromApi = async <T extends object>(
  endpoint: string,
  options: RequestInit = {},
  defaultValue: object = {},
): Promise<[T, number]> => {
  console.log("API request to", API_BASE_URL + endpoint);
  try {
    const res = await fetch(API_BASE_URL + endpoint, {
      cache: "no-store",
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return [
      (await res.json()) as T,
      Number(res.headers.get("x-total-count")) || 0,
    ];
  } catch (error) {
    console.error("Fetch error:", error);
    return [defaultValue as T, 0];
  }
};

const createQueryString = (params: QueryParams): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params)
    .filter(([_, value]) => value != null && value !== "")
    .forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Append each array item as the same key
        value.forEach((item) => searchParams.append(key, String(item)));
      } else {
        // Append the single value
        searchParams.append(key, String(value));
      }
    });

  return searchParams.toString();
};

// Fetch Functions
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

export const deleteConfig = async (id: string): Promise<ConfigSchema> => {
  const [data] = await fetchFromApi<ConfigSchema>(`/configs/${id}`, {
    method: "DELETE",
  });
  return data;
};

const fetchByConfigId = async <T>(
  configId: string,
  resource: string,
): Promise<T[]> => {
  const queryString = createQueryString({ configId });
  const [data] = await fetchFromApi<T[]>(`/${resource}?${queryString}`);
  return data;
};

export const fetchMatchesByConfigId = (configId: string) =>
  fetchByConfigId<MatchSchema>(configId, "matches");

export const fetchBansByConfigId = (configId: string) =>
  fetchByConfigId<BanSchema>(configId, "bans");

export const fetchUnbansByConfigId = (configId: string) =>
  fetchByConfigId<UnbanSchema>(configId, "unbans");

export const fetchMatches = async (
  filters: MatchFiltersDto,
): Promise<MatchSchema[]> => {
  const queryString = createQueryString(filters);
  const [data] = await fetchFromApi<MatchSchema[]>(`/matches?${queryString}`);
  return data;
};

export const fetchBans = async (
  filters: BanFiltersDto,
): Promise<BanSchema[]> => {
  const queryString = createQueryString(filters);
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

export const fetchStatsTimeline = async (
  filters: StatsTimelineFiltersDto,
): Promise<StatsTimelineResponse> => {
  const queryString = createQueryString(filters);
  const [data] = await fetchFromApi<StatsTimelineResponse>(
    `/stats/timeline?${queryString}`,
  );
  return data;
};

export const fetchIpInfos = async (
  filters: IpInfosFiltersDto,
): Promise<Record<string, Partial<IpInfosResponse>>> => {
  const queryString = createQueryString(filters);
  const [data] = await fetchFromApi<Record<string, Partial<IpInfosResponse>>>(
    `/ip-infos?${queryString}`,
  );
  return data;
};

export const fetchEvents = async (
  filters: EventFiltersDto,
): Promise<{ data: EventResponse[]; totalCount: number }> => {
  const queryString = createQueryString(filters);
  const [data, totalCount] = await fetchFromApi<EventResponse[]>(
    `/events?${queryString}`,
  );
  return { data, totalCount };
};
