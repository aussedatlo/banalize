import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { WatcherStatusRecord } from "./models/watcher-status-record";
import { WatcherManagerService } from "./watcher-manager.service";

@ApiTags("watchers")
@Controller("watchers")
export class WatchersController {
  constructor(private readonly watcherManagerService: WatcherManagerService) {}

  @Get("/status")
  @ApiOperation({
    summary: "Retreive the status of all watchers",
    description: "Fetches the status of all watchers.",
  })
  @ApiResponse({
    type: WatcherStatusRecord,
    description: "An object containing the status of all watchers.",
  })
  async getStatsHistory(): Promise<WatcherStatusRecord> {
    return this.watcherManagerService.getStatus();
  }
}
