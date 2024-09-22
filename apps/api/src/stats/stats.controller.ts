import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FiltersStatsHistoryDto } from "./dto/filters-stats-history.dto";
import { StatsCountCollection } from "./entities/StatsCount";
import { StatsHistory } from "./entities/StatsHistory";
import { StatsCountService } from "./stats-count.service";
import { StatsHistoryService } from "./stats-history.service";

@ApiTags("stats")
@Controller("stats")
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
    type: StatsHistory,
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
    type: StatsCountCollection,
    description:
      "An object containing the count of different event types (e.g., bans, matches) with their respective values.",
  })
  async getStatsCount(): Promise<StatsCountCollection> {
    return this.statsCountService.getStats();
  }
}
