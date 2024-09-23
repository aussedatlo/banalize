import { ApiProperty } from "@nestjs/swagger";
import { WatcherStatusRecord } from "src/watchers/interfaces/watcher-status-record.interface";
import { WatcherStatusModel } from "./watcher-status.model";

export class WatcherStatusRecordModel implements WatcherStatusRecord {
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
  data: Record<string, WatcherStatusModel>;
}
