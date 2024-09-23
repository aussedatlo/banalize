import { StatsCount } from "src/stats/interfaces/stats-count.interface";

export class StatsCountModel implements StatsCount {
  bansCount: number;
  matchesCount: number;
  currentBansCount: number;
  currentMatchesCount: number;
}
