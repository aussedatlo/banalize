import { ApiProperty } from "@nestjs/swagger";
import { WatcherStatus } from "./watcher-status";

export class WatcherStatusRecord {
  @ApiProperty({
    description: "Status of all watchers.",
    example: {
      "66ed87f0220c9d147e766754": {
        status: "started",
        processedLines: 10,
        error: null,
      },
    },
  })
  data: Record<string, WatcherStatus>;
}
