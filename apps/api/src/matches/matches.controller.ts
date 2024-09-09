import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { MatchesService } from "./matches.service";
import { Match } from "./schemas/match";

@ApiTags("matches")
@Controller("matches")
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  @ApiOperation({ summary: "Get all matches" })
  @ApiResponse({ type: [Match] })
  async findAll(): Promise<Match[]> {
    return this.matchesService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a match by id" })
  @ApiResponse({ type: Match })
  async findOne(@Param("id") id: string): Promise<Match> {
    return this.matchesService.findOne(id);
  }
}
