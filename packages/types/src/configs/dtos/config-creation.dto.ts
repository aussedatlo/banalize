import { type ConfigSchema } from "../schemas/config.schema";

export type ConfigCreationDto = Omit<ConfigSchema, "_id">;
