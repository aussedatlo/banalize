import { Controller, Get, Query } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { FiltersStatsHistoryDto } from "./dto/filters-stats-history.dto";
import { StatsHistory } from "./interfaces/stats-history.interface";
import { StatsCountRecordModel } from "./models/stats-count-record.model";
import { StatsCountModel } from "./models/stats-count.model";
import { StatsHistoryRecordModel } from "./models/stats-history-record.model";
import { StatsHistoryModel } from "./models/stats-history.model";
import { StatsCountService } from "./services/stats-count.service";
import { StatsHistoryService } from "./services/stats-history.service";

@ApiTags("stats")
@Controller("stats")
@ApiExtraModels(StatsCountModel)
@ApiExtraModels(StatsHistoryRecordModel)
export class StatsController {
  constructor(
    private readonly statsHistoryService: StatsHistoryService,
    private readonly statsCountService: StatsCountService,
  ) {}

  @Get("/history")
  @ApiOperation({
    summary: "Retreive the stats history",
    description: "Fetches all history stats.",
  })
  @ApiResponse({
    type: StatsHistoryModel,
    description: "An object containing the stats history.",
  })
  async getStatsHistory(
    @Query() filters: FiltersStatsHistoryDto,
  ): Promise<StatsHistory> {
    return await this.statsHistoryService.getStats(filters);
  }

  @Get("/count")
  @ApiOperation({
    summary:
      "Retrieve the current and total count of events, including bans and matches",
    description:
      "Fetches the aggregated count of events such as bans and matches.",
  })
  @ApiResponse({
    type: StatsCountRecordModel,
    description:
      "An object containing the count of different event types (e.g., bans, matches) with their respective values.",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          additionalProperties: {
            $ref: getSchemaPath(StatsCountModel),
          },
        },
      },
    },
  })
  async getStatsCount(): Promise<StatsCountRecordModel> {
    return this.statsCountService.getStats();
  }
}
