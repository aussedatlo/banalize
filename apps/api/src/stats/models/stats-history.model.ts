import { StatsHistory } from "src/stats/interfaces/stats-history.interface";
import { StatsHistoryRecordModel } from "./stats-history-record.model";

export class StatsHistoryModel implements StatsHistory {
  bans: StatsHistoryRecordModel;
  matches: StatsHistoryRecordModel;
}
