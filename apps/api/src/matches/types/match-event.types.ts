import { ConfigSchema } from "@banalize/types";

export class MatchEvent {
  constructor(
    public readonly line: string,
    public readonly ip: string,
    public readonly config: ConfigSchema,
    public readonly timestamp?: number,
    public readonly banned?: boolean,
  ) {}
}
