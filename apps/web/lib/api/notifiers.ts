import { NotifierConfigDto, NotifierConfigSchema } from "@banalize/types";
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
  dto: NotifierConfigDto,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<NotifierConfigSchema, NotifierConfigDto>(
    HttpMethod.POST,
    ENDPOINT,
    dto,
  );
  return data;
};

export const updateNotifierConfig = async (
  id: string,
  dto: NotifierConfigDto,
): Promise<NotifierConfigSchema> => {
  const { data } = await fetchFromApi<NotifierConfigSchema, NotifierConfigDto>(
    HttpMethod.PUT,
    `${ENDPOINT}/${id}`,
    dto,
  );
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

export const sendTestNotification = async (
  id: string,
): Promise<{ message: string; success: boolean }> => {
  const { data } = await fetchFromApi<{ message: string; success: boolean }>(
    HttpMethod.POST,
    `${ENDPOINT}/${id}/test`,
  );
  return data;
};
