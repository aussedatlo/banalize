import { Config } from "src/configs/schemas/config.schema";

export class MatchEvent {
  constructor(
    public readonly line: string,
    public readonly ip: string,
    public readonly config: Config,
  ) {}
}
