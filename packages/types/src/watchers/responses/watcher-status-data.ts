import { WatcherStatus } from "../enums/watcher-status.enum";

export interface WatcherStatusData {
  processedLines: number;
  status: WatcherStatus;
  error: string | null;
}
