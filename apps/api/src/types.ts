// interfaces are renamed to Models and Dto to match swagger naming conventions
export type { FiltersStatsHistory as FiltersStatsHistoryDto } from "src/stats/interfaces/filters-stats-history.interface";
export type { StatsCountRecord as StatsCountRecordModel } from "src/stats/interfaces/stats-count-record.interface";
export type { StatsCount as StatsCountModel } from "src/stats/interfaces/stats-count.interface";
export type { StatsHistoryRecord } from "src/stats/interfaces/stats-history-record.interface";
export type { StatsHistory as StatsHistoryModel } from "src/stats/interfaces/stats-history.interface";
export type { Status } from "src/watchers/enums/status.enum";
export type { WatcherStatusRecord as WatcherStatusRecordModel } from "src/watchers/interfaces/watcher-status-record.interface";
export type { WatcherStatus as WatcherStatusModel } from "src/watchers/interfaces/watcher-status.interface";
