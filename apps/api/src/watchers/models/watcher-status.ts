import { ApiProperty } from "@nestjs/swagger";

export enum Status {
  INIT = "init",
  STARTED = "started",
  STOPPED = "stopped",
  ERROR = "error",
}

export class WatcherStatus {
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
