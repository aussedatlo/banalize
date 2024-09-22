import { Ban } from "types/Ban";
import { Config } from "types/Config";
import { Match } from "types/Match";

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

export const fetchConfigs = async (): Promise<Config[]> => {
  return fetchFromApi("/configs", undefined, []);
};

export const fetchConfigById = async (id: string): Promise<Config> => {
  return fetchFromApi(`/configs/${id}`);
};

export const createConfig = async (config: Omit<Config, "_id">) => {
  return fetchFromApi("/configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
};

export const updateConfig = async (config: Config) => {
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
): Promise<Match[]> => {
  const queryString = createQueryString({ configId });
  return fetchFromApi(`/matches?${queryString}`);
};

export const fetchBansByConfigId = async (configId: string): Promise<Ban[]> => {
  const queryString = createQueryString({ configId });
  return fetchFromApi(`/bans?${queryString}`);
};

export const fetchActiveMatches = async (
  configId: string,
  timestamp_gt: number,
): Promise<Match[]> => {
  const queryString = createQueryString({
    configId,
    timestamp_gt: timestamp_gt.toString(),
  });
  return fetchFromApi(`/matches?${queryString}`);
};

export const fetchActiveBans = async (configId: string): Promise<Ban[]> => {
  const queryString = createQueryString({
    configId,
    active: true.toString(),
  });
  return fetchFromApi(`/bans?${queryString}`);
};

export const fetchStatsCount = async () => {
  return fetchFromApi("/stats/count");
};
