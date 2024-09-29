import {
  type StatsSummary,
  type StatsSummaryResponse as StatsSummaryResponseType,
} from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";

export class StatsSummaryResponse implements StatsSummaryResponseType {
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
  })
  data: Record<string, StatsSummary> = {};
}
