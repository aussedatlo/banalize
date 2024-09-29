import { type BanSchema } from "../schemas/ban.schema";

export type BanModificationDto = Partial<Omit<BanSchema, "_id">>;
