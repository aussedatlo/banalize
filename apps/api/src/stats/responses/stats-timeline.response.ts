import {
  type StatsTimelineRecord,
  type StatsTimelineResponse as StatsTimelineResponseType,
} from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";

export class StatsTimelineResponse implements StatsTimelineResponseType {
  @ApiProperty({
    description: "The bans stats timeline",
    example: {
      data: {
        "19-09-2024": 0,
        "20-09-2024": 1,
        "21-09-2024": 2,
      },
    },
  })
  bans: StatsTimelineRecord;

  @ApiProperty({
    description: "The matches stats timeline",
    example: {
      data: {
        "19-09-2024": 0,
        "20-09-2024": 1,
        "21-09-2024": 2,
      },
    },
  })
  matches: StatsTimelineRecord;
}
