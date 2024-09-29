import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
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
  async findAll(@Query() filters: MatchFiltersDto): Promise<MatchSchema[]> {
    return this.matchesService.findAll(filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a match by id" })
  @ApiResponse({ type: MatchSchema })
  async findOne(@Param("id") id: string): Promise<MatchSchema> {
    return this.matchesService.findOne(id);
  }
}
