import { type MatchSchema } from "../schemas/match.schema";

export type MatchCreationDto = Omit<MatchSchema, "_id">;
