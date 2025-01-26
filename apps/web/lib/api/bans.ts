import { BanCreationDto, BanFiltersDto, BanSchema } from "@banalize/types";
import { fetchFromApi, HttpMethod } from "./utils";

const ENDPOINT = "/bans";

export const fetchBans = async (
  filters: BanFiltersDto,
): Promise<{ bans: BanSchema[]; totalCount: number }> => {
  const { data, totalCount } = await fetchFromApi<BanSchema[], BanFiltersDto>(
    HttpMethod.GET,
    ENDPOINT,
    filters,
  );
  return { bans: data || [], totalCount };
};

export const ban = async (dto: BanCreationDto) => {
  const { data } = await fetchFromApi<BanSchema, BanCreationDto>(
    HttpMethod.POST,
    ENDPOINT,
    dto,
  );
  return data;
};

export const unban = async (id: string) => {
  const { data } = await fetchFromApi<BanSchema, BanCreationDto>(
    HttpMethod.PATCH,
    `${ENDPOINT}/${id}/disable`,
  );
  return data;
};
