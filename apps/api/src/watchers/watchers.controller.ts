import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { WatcherStatusesResponse } from "./models/watcher-statuses.response";
import { WatcherManagerService } from "./services/watcher-manager.service";

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
    type: WatcherStatusesResponse,
    description: "An object containing the status of all watchers.",
  })
  async getStatsHistory(): Promise<WatcherStatusesResponse> {
    return this.watcherManagerService.getStatus();
  }
}
