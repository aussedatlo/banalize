import { Ban } from "types/Ban";
import { Config } from "types/Config";
import { Match } from "types/Match";

const getServerUrlAndPort = () =>
  process.env.SERVER_URL && process.env.SERVER_PORT
    ? `${process.env.SERVER_URL}:${process.env.SERVER_PORT}`
    : "/api";

export const fetchConfigs = async (): Promise<Config[]> => {
  const res = await fetch(getServerUrlAndPort() + "/configs");
  return await res.json();
};

export const fetchConfigById = async (id: string) => {
  const res = await fetch(getServerUrlAndPort() + `/configs/${id}`);
  return await res.json();
};

export const createConfig = async (config: Omit<Config, "_id">) => {
  const res = await fetch(getServerUrlAndPort() + "/configs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });
  return await res.json();
};

export const deleteConfig = async (id: string) => {
  const res = await fetch(getServerUrlAndPort() + `/configs/${id}`, {
    method: "DELETE",
  });
  return await res.json();
};

export const fetchMatchesByConfigId = async (
  configId: string,
): Promise<Match[]> => {
  const filters = {
    configId,
  };
  const queryString = new URLSearchParams(filters).toString();
  const res = await fetch(getServerUrlAndPort() + `/matches?${queryString}`);
  return await res.json();
};

export const fetchBansByConfigId = async (configId: string): Promise<Ban[]> => {
  const filters = {
    configId,
  };
  const queryString = new URLSearchParams(filters).toString();
  const res = await fetch(getServerUrlAndPort() + `/bans?${queryString}`);
  return await res.json();
};
