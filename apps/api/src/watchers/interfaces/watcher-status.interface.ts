import { Status } from "src/watchers/enums/status.enum";

export interface WatcherStatus {
  linesProcessed: number;
  status: Status;
  error: string | null;
}
