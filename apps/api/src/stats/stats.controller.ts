import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FiltersStatsHistoryDto } from "./dto/filters-stats-history.dto";
import { StatsHistory } from "./entities/StatsHistory";
import { StatsHistoryService } from "./stats-history.service";

@ApiTags("stats")
@Controller("stats")
export class StatsController {
  constructor(private readonly statsService: StatsHistoryService) {}

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
    return await this.statsService.getStats(filters);
  }
}
