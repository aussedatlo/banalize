import {
  type WatcherStatusData,
  type WatcherStatusesResponse as WatcherStatusesResponseType,
} from "@banalize/types";
import { ApiProperty } from "@nestjs/swagger";

export class WatcherStatusesResponse implements WatcherStatusesResponseType {
  @ApiProperty({
    description: "Status of all watchers.",
    example: {
      "66ed87f0220c9d147e766754": {
        status: "running",
        processedLines: 10,
        error: null,
      },
    },
  })
  data: Record<string, WatcherStatusData>;
}
