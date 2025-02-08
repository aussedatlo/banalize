import { Controller, Get, Param, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { type Response } from "express";
import { MatchFiltersDto } from "./dtos/match-filters.dto";
import { MatchSchema } from "./schemas/match.schema";
import { MatchesService } from "./services/matches.service";

@ApiTags("matches")
@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: "Get all matches" })
  @ApiResponse({ type: [MatchSchema] })
  async findAll(
    @Query() filters: MatchFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const { matches, totalCount } = await this.matchesService.findAll(filters);
    res.setHeader("X-Total-Count", totalCount);
    res.json(matches);
  }
  @Get(":id")
  @ApiOperation({ summary: "Get a match by id" })
  @ApiResponse({ type: MatchSchema })
  async findOne(@Param("id") id: string): Promise<MatchSchema> {
    return this.matchesService.findOne(id);
  }
}
