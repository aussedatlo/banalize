import { ConfigSchema } from "@banalize/types";
import { notifications } from "@mantine/notifications";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/configs";

export const fetchConfigs = (): Promise<ConfigSchema[]> =>
  fetchFromApi<ConfigSchema[]>(HttpMethod.GET, ENDPOINT)
    .map(({ data }) => data)
    .orDefault([]);

export const fetchConfigById = async (id: string): Promise<ConfigSchema> =>
  fetchFromApi<ConfigSchema>(HttpMethod.GET, `${ENDPOINT}/${id}`)
    .map(({ data }) => data)
    .orDefault({} as ConfigSchema);

export const createConfig = (config: Omit<ConfigSchema, "_id">) =>
  fetchFromApi<ConfigSchema, Omit<ConfigSchema, "_id">>(
    HttpMethod.POST,
    ENDPOINT,
    config,
  )
    .ifLeft((error) => {
      notifications.show({
        title: "Config creation error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Config created",
        message: "Config was successfully created",
        color: "cyan",
      });
    });

export const updateConfig = (config: ConfigSchema) =>
  fetchFromApi<ConfigSchema, ConfigSchema>(
    HttpMethod.PUT,
    `${ENDPOINT}/${config._id}`,
    config,
  )
    .ifLeft((error) => {
      notifications.show({
        title: "Config update error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Config updated",
        message: "Config was successfully updated",
        color: "cyan",
      });
    });

export const deleteConfig = (id: string) =>
  fetchFromApi<ConfigSchema>(HttpMethod.DELETE, `${ENDPOINT}/${id}`)
    .ifLeft((error) => {
      notifications.show({
        title: "Config deletion error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Config deleted",
        message: "Config was successfully deleted",
        color: "cyan",
      });
    });
