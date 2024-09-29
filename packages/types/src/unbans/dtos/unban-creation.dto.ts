import { type UnbanSchema } from "../schemas/unban.schema";

export type UnbanCreationDto = Omit<UnbanSchema, "_id">;
