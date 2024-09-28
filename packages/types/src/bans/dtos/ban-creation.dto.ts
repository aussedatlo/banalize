import { type BanSchema } from "../schemas/ban.schema";

export type BanCreationDto = Omit<BanSchema, "_id" | "active">;
