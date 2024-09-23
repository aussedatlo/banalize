import { Controller, Get } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";

import { WatcherStatusRecordModel } from "./models/watcher-status-record.model";
import { WatcherStatusModel } from "./models/watcher-status.model";
import { WatcherManagerService } from "./services/watcher-manager.service";

@ApiTags("watchers")
@ApiExtraModels(WatcherStatusModel)
@Controller("watchers")
export class WatchersController {
  constructor(private readonly watcherManagerService: WatcherManagerService) {}

  @Get("/status")
  @ApiOperation({
    summary: "Retreive the status of all watchers",
    description: "Fetches the status of all watchers.",
  })
  @ApiResponse({
    type: WatcherStatusRecordModel,
    description: "An object containing the status of all watchers.",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          additionalProperties: {
            $ref: getSchemaPath(WatcherStatusModel),
          },
        },
      },
    },
  })
  async getStatsHistory(): Promise<WatcherStatusRecordModel> {
    return this.watcherManagerService.getStatus();
  }
}
