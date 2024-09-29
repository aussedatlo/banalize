import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { StatsTimelineFiltersDto } from "./dtos/stats-timeline-filters.dto";
import { StatsSummaryResponse } from "./responses/stats-summary.response";
import { StatsTimelineResponse } from "./responses/stats-timeline.response";
import { StatsSummaryService } from "./services/stats-summary.service";
import { StatsTimelineService } from "./services/stats-timeline.service";

@ApiTags("stats")
@Controller("stats")
export class StatsController {
  constructor(
    private readonly statsTimelineService: StatsTimelineService,
    private readonly statsSummaryService: StatsSummaryService,
  ) {}

  @Get("/timeline")
  @ApiOperation({
    summary: "Retrieve statistics timeline data",
    description:
      "Fetches historical statistics data based on the provided filters. This endpoint allows clients to obtain a timeline view of various statistics over a specified period.",
  })
  @ApiResponse({
    type: StatsTimelineResponse,
    description:
      "Returns a response object containing the timeline statistics data.",
  })
  async getStatsHistory(
    @Query() filters: StatsTimelineFiltersDto,
  ): Promise<StatsTimelineResponse> {
    return await this.statsTimelineService.getStats(filters);
  }

  @Get("/summary")
  @ApiOperation({
    summary: "Retrieve summary statistics",
    description:
      "Fetches a summary of statistics regarding counts of various metrics. This endpoint provides a quick overview of the current statistics available in the system.",
  })
  @ApiResponse({
    type: StatsSummaryResponse,
    description:
      "Returns a response object containing the summary statistics data.",
  })
  async getStatsCount(): Promise<StatsSummaryResponse> {
    return this.statsSummaryService.getStats();
  }
}
