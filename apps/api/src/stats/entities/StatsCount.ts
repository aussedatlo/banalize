import { ApiProperty, getSchemaPath } from "@nestjs/swagger";

export class StatsCountData {
  @ApiProperty({
    description: "Number of total bans.",
    example: 0,
  })
  bansCount: number;

  @ApiProperty({
    description: "Number of total matches.",
    example: 0,
  })
  matchesCount: number;

  @ApiProperty({
    description: "Number of current bans.",
    example: 0,
  })
  currentBansCount: number;

  @ApiProperty({
    description: "Number of current matches.",
    example: 0,
  })
  currentMatchesCount: number;
}

export class StatsCountCollection {
  @ApiProperty({
    description:
      "Statistics related to current bans and matches, keyed by unique IDs.",
    type: "object",
    example: {
      "66dca3ca17f21044b9dbcaf5": {
        bansCount: 5,
        matchesCount: 10,
        currentBansCount: 2,
        currentMatchesCount: 3,
      },
      "72a4b3bb17e31044b9dbcaf7": {
        bansCount: 8,
        matchesCount: 12,
        currentBansCount: 1,
        currentMatchesCount: 6,
      },
    },
    additionalProperties: {
      $ref: getSchemaPath(StatsCountData),
    },
  })
  data: Record<string, StatsCountData>;
}
