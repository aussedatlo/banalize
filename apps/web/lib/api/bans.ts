import { BanCreationDto, BanFiltersDto, BanSchema } from "@banalize/types";
import { notifications } from "@mantine/notifications";
import { HttpMethod } from ".";
import { fetchFromApi } from "./utils";

const ENDPOINT = "/bans";

export const fetchBans = async (
  filters: BanFiltersDto,
): Promise<{ bans: BanSchema[]; totalCount: number }> =>
  fetchFromApi<BanSchema[], BanFiltersDto>(HttpMethod.GET, ENDPOINT, filters)
    .map(({ data, totalCount }) => ({ bans: data, totalCount }))
    .orDefault({
      bans: [],
      totalCount: 0,
    });

export const ban = (dto: BanCreationDto) =>
  fetchFromApi<BanSchema, BanCreationDto>(HttpMethod.POST, ENDPOINT, dto)
    .ifLeft((error) => {
      notifications.show({
        title: "Ban creation error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Ban created",
        message: `IP ${dto.ip} was successfully banned`,
        color: "cyan",
      });
    });

export const unban = (id: string) =>
  fetchFromApi<BanSchema, BanCreationDto>(
    HttpMethod.PATCH,
    `${ENDPOINT}/${id}/disable`,
  )
    .ifLeft((error) => {
      notifications.show({
        title: "Ban removal error",
        message: Array.isArray(error.message)
          ? error.message.join(", ")
          : error.message,
        color: "pink",
      });
    })
    .ifRight(() => {
      notifications.show({
        title: "Ban removed",
        message: `IP ${id} was successfully unbanned`,
        color: "cyan",
      });
    });
