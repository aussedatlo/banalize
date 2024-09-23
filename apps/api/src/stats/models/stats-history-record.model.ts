import { ApiProperty } from "@nestjs/swagger";
import { StatsHistoryRecord } from "src/stats/interfaces/stats-history-record.interface";

export class StatsHistoryRecordModel implements StatsHistoryRecord {
  @ApiProperty({
    type: "object",
    description: "Statistics keyed by date.",
    example: {
      "12-09-2024": 0,
      "13-09-2024": 1,
      "14-09-2024": 2,
    },
  })
  public data: Record<string, number> = {};
}
