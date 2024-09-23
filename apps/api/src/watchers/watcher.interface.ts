import { Config } from "src/configs/schemas/config.schema";

export enum Status {
  INIT = "init",
  STARTED = "started",
  STOPPED = "stopped",
  ERROR = "error",
}

export interface Watcher {
  readonly config: Config;
  processedLines: number;
  status: Status;
  error: Error | null;

  start(): void;
  stop(): void;
}
