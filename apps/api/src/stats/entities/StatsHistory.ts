import { ApiProperty } from "@nestjs/swagger";

export class StatsHistoryData {
  @ApiProperty({
    type: "object",
    description: "Statistics keyed by date.",
    example: {
      "12-09-2024": 0,
      "13-09-2024": 1,
      "14-09-2024": 2,
    },
  })
  public data: Record<string, number>;
}

export class StatsHistory {
  @ApiProperty({
    type: StatsHistoryData,
    description: "Statistics related to bans, keyed by date.",
    example: {
      data: {
        "12-09-2024": 0,
        "13-09-2024": 1,
        "14-09-2024": 2,
      },
    },
  })
  bans: StatsHistoryData;

  @ApiProperty({
    type: StatsHistoryData,
    description: "Statistics related to matches, keyed by date.",
    example: {
      data: {
        "12-09-2024": 0,
        "13-09-2024": 1,
        "14-09-2024": 2,
      },
    },
  })
  matches: StatsHistoryData;
}
