import { ConfigSchema } from "@banalize/types";

export class MatchEvent {
  constructor(
    public readonly line: string,
    public readonly ip: string,
    public readonly config: ConfigSchema,
  ) {}
}
