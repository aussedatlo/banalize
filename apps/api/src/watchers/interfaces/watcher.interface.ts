import { ConfigSchema, WatcherStatus } from "@banalize/types";

export interface Watcher {
  readonly config: ConfigSchema;
  processedLines: number;
  status: WatcherStatus;
  error: Error | null;

  start(): void;
  stop(): void;
}
