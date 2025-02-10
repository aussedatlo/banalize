import { NotifierConfigDto, NotifierConfigSchema } from "@banalize/types";
import { notifications } from "@mantine/notifications";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/notifications";

export const fetchNotifierConfigs = (): Promise<NotifierConfigSchema[]> =>
  fetchFromApi<NotifierConfigSchema[]>(HttpMethod.GET, ENDPOINT)
    .map(({ data }) => data)
    .orDefault([]);

export const createNotifierConfig = (dto: NotifierConfigDto) =>
  fetchFromApi<NotifierConfigSchema, NotifierConfigDto>(
    HttpMethod.POST,
    ENDPOINT,
    dto,
  )
    .ifLeft((error) => {
      notifications.show({
        title: "Notifier config creation error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Notifier config created",
        message: "Notifier config was successfully created",
        color: "cyan",
      });
    });

export const updateNotifierConfig = (id: string, dto: NotifierConfigDto) =>
  fetchFromApi<NotifierConfigSchema, NotifierConfigDto>(
    HttpMethod.PUT,
    `${ENDPOINT}/${id}`,
    dto,
  )
    .ifLeft((error) => {
      notifications.show({
        title: "Notifier config update error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Notifier config updated",
        message: "Notifier config was successfully updated",
        color: "cyan",
      });
    });

export const deleteNotifierConfig = (id: string) =>
  fetchFromApi<NotifierConfigSchema>(HttpMethod.DELETE, `${ENDPOINT}/${id}`)
    .ifLeft((error) => {
      notifications.show({
        title: "Notifier config deletion error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Notifier config deleted",
        message: "Notifier config was successfully deleted",
        color: "cyan",
      });
    });

export const sendTestNotification = (id: string) =>
  fetchFromApi<{ message: string; success: boolean }, undefined>(
    HttpMethod.POST,
    `${ENDPOINT}/${id}/test`,
    undefined,
  )
    .ifLeft((error) => {
      notifications.show({
        title: "Test notification error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(({ data }) => {
      notifications.show({
        title: "Test notification",
        message: data.message,
        color: data.success ? "cyan" : "pink",
      });
    });
