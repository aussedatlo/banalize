import { ConfigSchema } from "@banalize/types";

export class BanEvent {
  constructor(
    public readonly ip: string,
    public readonly config: ConfigSchema,
    public readonly line?: string,
    public readonly matchCount?: number,
  ) {}
}
