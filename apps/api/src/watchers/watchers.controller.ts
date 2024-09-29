import { Controller, Get, Param } from "@nestjs/common";
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
  async getStatuses(): Promise<WatcherStatusesResponse> {
    return this.watcherManagerService.getStatuses();
  }

  @Get("/status/:configId")
  @ApiOperation({
    summary: "Retreive the status of a watcher for a specific config",
    description: "Fetches the status of a watcher for a specific config.",
  })
  @ApiResponse({
    type: WatcherStatusesResponse,
    description: "An object containing the status of the watcher.",
  })
  async getStatus(
    @Param("configId") configId: string,
  ): Promise<WatcherStatusesResponse> {
    return this.watcherManagerService.getStatus(configId);
  }
}
