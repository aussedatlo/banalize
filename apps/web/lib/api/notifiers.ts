import { NotifierConfigSchema } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/notifications";

export const fetchNotifierConfigs = async (): Promise<
  NotifierConfigSchema[]
> => {
  const { data } = await fetchFromApi<NotifierConfigSchema[]>(
    HttpMethod.GET,
    ENDPOINT,
  );
  return data || [];
};

export const createNotifierConfig = async (
  dto: NotifierConfigSchema,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<
    NotifierConfigSchema,
    NotifierConfigSchema
  >(HttpMethod.POST, ENDPOINT, dto);
  return data;
};

export const updateNotifierConfig = async (
  id: string,
  dto: NotifierConfigSchema,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<
    NotifierConfigSchema,
    NotifierConfigSchema
  >(HttpMethod.PUT, `${ENDPOINT}/${id}`, dto);
  return data;
};

export const deleteNotifierConfig = async (
  id: string,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<NotifierConfigSchema>(
    HttpMethod.DELETE,
    `${ENDPOINT}/${id}`,
  );
  return data;
};
