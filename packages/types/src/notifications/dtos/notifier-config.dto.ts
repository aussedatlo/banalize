import { NotifierConfigSchema } from "../schemas/notifier-config.schema";

export type NotifierConfigDto = Omit<NotifierConfigSchema, "_id">;
