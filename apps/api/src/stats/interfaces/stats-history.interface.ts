import { StatsHistoryRecord } from "./stats-history-record.interface";

export interface StatsHistory {
  bans: StatsHistoryRecord;
  matches: StatsHistoryRecord;
}
