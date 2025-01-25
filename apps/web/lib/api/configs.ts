import { ConfigSchema } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/configs";

export const fetchConfigs = async (): Promise<ConfigSchema[]> => {
  const { data } = await fetchFromApi<ConfigSchema[]>(HttpMethod.GET, ENDPOINT);
  return data || [];
};

export const fetchConfigById = async (id: string): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema>(
    HttpMethod.GET,
    `${ENDPOINT}/${id}`,
  );
  return data;
};

export const createConfig = async (
  config: Omit<ConfigSchema, "_id">,
): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema, Omit<ConfigSchema, "_id">>(
    HttpMethod.POST,
    ENDPOINT,
    config,
  );
  return data;
};

export const updateConfig = async (
  config: ConfigSchema,
): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema, ConfigSchema>(
    HttpMethod.PUT,
    `${ENDPOINT}/${config._id}`,
    config,
  );
  return data;
};

export const deleteConfig = async (id: string): Promise<ConfigSchema> => {
  const { data } = await fetchFromApi<ConfigSchema>(
    HttpMethod.DELETE,
    `${ENDPOINT}/${id}`,
  );
  return data;
};
