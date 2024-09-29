import { type WatcherStatusData } from "./watcher-status-data";

export interface WatcherStatusesResponse {
  data: Record<string, WatcherStatusData>;
}
