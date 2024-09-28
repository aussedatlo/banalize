import { WatcherStatus } from "@banalize/types";
import { ConfigSchema } from "src/configs/schemas/config.schema";

export interface Watcher {
  readonly config: ConfigSchema;
  processedLines: number;
  status: WatcherStatus;
  error: Error | null;

  start(): void;
  stop(): void;
}
