import { WatcherStatus } from "../enums/watcher-status.enum";

export interface WatcherStatusData {
  linesProcessed: number;
  status: WatcherStatus;
  error: string | null;
}
