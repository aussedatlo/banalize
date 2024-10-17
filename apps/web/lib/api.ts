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
  NotifierConfigSchema,
  StatsSummaryResponse,
  StatsTimelineFiltersDto,
  StatsTimelineResponse,
  WatcherStatusesResponse,
} from "@banalize/types";

const API_BASE_URL_SERVER = process.env.BANALIZE_WEB_API_SERVER_URL;
const API_BASE_URL_CLIENT = `${process.env.BANALIZE_WEB_BASE_URL}/api`;

if (!API_BASE_URL_SERVER) {
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
): Promise<{ data: T; totalCount: number }> => {
  const isServer = typeof window === "undefined";
  const url = isServer ? API_BASE_URL_SERVER : API_BASE_URL_CLIENT;
  console.log("API request to", url + endpoint);
  try {
    const res = await fetch(url + endpoint, {
      cache: "no-store",
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return {
      data: (await res.json()) as T,
      totalCount: Number(res.headers.get("x-total-count")) || 0,
    };
  } catch (error) {
    console.error("Fetch error:", error);
    return { data: defaultValue as T, totalCount: 0 };
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
  const { data } = await fetchFromApi<ConfigSchema[]>(
    "/configs",
    undefined,
    [],
  );
  return data;
};

export const fetchConfigById = async (id: string): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema>(`/configs/${id}`);
  return data;
};

export const createConfig = async (
  config: Omit<ConfigSchema, "_id">,
): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema>("/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return data;
};

export const updateConfig = async (
  config: ConfigSchema,
): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema>(`/configs/${config._id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return data;
};

export const deleteConfig = async (id: string): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema>(`/configs/${id}`, {
    method: "DELETE",
  });
  return data;
};

export const fetchMatches = async (
  filters: MatchFiltersDto,
): Promise<{ matches: MatchSchema[]; totalCount: number }> => {
  const queryString = createQueryString(filters);
  const { data, totalCount } = await fetchFromApi<MatchSchema[]>(
    `/matches?${queryString}`,
    {},
    [],
  );
  return { matches: data, totalCount };
};

export const fetchBans = async (
  filters: BanFiltersDto,
): Promise<{ bans: BanSchema[]; totalCount: number }> => {
  const queryString = createQueryString(filters);
  const { data, totalCount } = await fetchFromApi<BanSchema[]>(
    `/bans?${queryString}`,
    {},
    [],
  );
  return { bans: data, totalCount };
};

export const fetchStatsSummary = async (): Promise<StatsSummaryResponse> => {
  const { data } = await fetchFromApi<StatsSummaryResponse>("/stats/summary");
  return data;
};

export const fetchWatcherStatuses =
  async (): Promise<WatcherStatusesResponse> => {
    const { data } =
      await fetchFromApi<WatcherStatusesResponse>("/watchers/status");
    return data;
  };

export const fetchWatcherStatus = async (
  configId: string,
): Promise<WatcherStatusesResponse> => {
  const { data } = await fetchFromApi<WatcherStatusesResponse>(
    `/watchers/status/${configId}`,
  );
  return data;
};

export const fetchStatsTimeline = async (
  filters: StatsTimelineFiltersDto,
): Promise<StatsTimelineResponse> => {
  const queryString = createQueryString(filters);
  const { data } = await fetchFromApi<StatsTimelineResponse>(
    `/stats/timeline?${queryString}`,
  );
  return data;
};

export const fetchIpInfos = async (
  filters: IpInfosFiltersDto,
): Promise<Record<string, Partial<IpInfosResponse>>> => {
  if (filters.ips.length === 0) {
    return {};
  }
  const queryString = createQueryString(filters);
  const { data } = await fetchFromApi<Record<string, Partial<IpInfosResponse>>>(
    `/ip-infos?${queryString}`,
  );
  return data;
};

export const fetchEvents = async (
  filters: EventFiltersDto,
): Promise<{ data: EventResponse[]; totalCount: number }> => {
  const queryString = createQueryString(filters);
  const { data, totalCount } = await fetchFromApi<EventResponse[]>(
    `/events?${queryString}`,
    {},
    [],
  );
  return { data, totalCount };
};

export const fetchNotifierConfigs = async (): Promise<
  NotifierConfigSchema[]
> => {
  const { data } = await fetchFromApi<NotifierConfigSchema[]>(
    "/notifications",
    { cache: "no-store" },
    [],
  );
  return data;
};

export const createNotifierConfig = async (
  dto: NotifierConfigSchema,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<NotifierConfigSchema>("/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  });
  return data;
};

export const updateNotifierConfig = async (
  id: string,
  dto: NotifierConfigSchema,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<NotifierConfigSchema>(
    `/notifications/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  );
  return data;
};

export const deleteNotifierConfig = async (
  id: string,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<NotifierConfigSchema>(
    `/notifications/${id}`,
    { method: "DELETE" },
  );
  return data;
};
