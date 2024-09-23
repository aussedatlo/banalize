import { ApiProperty } from "@nestjs/swagger";
import { Status } from "src/watchers/enums/status.enum";
import { WatcherStatus } from "src/watchers/interfaces/watcher-status.interface";

export class WatcherStatusModel implements WatcherStatus {
  @ApiProperty({
    description: "Number of lines processed by the watcher.",
    example: 0,
  })
  linesProcessed: number = 0;

  @ApiProperty({
    description: "Current status of the watcher.",
    example: "init",
  })
  status: Status = Status.INIT;

  @ApiProperty({
    description: "Error message, if any.",
    example: null,
  })
  error: string | null = null;
}
