import { Config } from "src/configs/schemas/config.schema";

export class BanEvent {
  constructor(
    public readonly ip: string,
    public readonly config: Config,
  ) {}
}
