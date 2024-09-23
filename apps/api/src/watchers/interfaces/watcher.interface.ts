import { ConfigSchema } from "src/configs/schemas/config.schema";
import { Status } from "src/watchers/enums/status.enum";

export interface Watcher {
  readonly config: ConfigSchema;
  processedLines: number;
  status: Status;
  error: Error | null;

  start(): void;
  stop(): void;
}
