import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateUnbanDto } from "./dto/create-unban.dto";
import { FiltersUnbansDto } from "./dto/filters-ban.dto";
import { UnbanSchema } from "./schemas/unban.schema";
import { UnbansService } from "./services/unbans.service";

@ApiTags("unbans")
@Controller("unbans")
export class UnbansController {
  constructor(private readonly unbansService: UnbansService) {}

  @Get()
  @ApiOperation({ summary: "Get all unbans" })
  @ApiResponse({ type: [UnbanSchema] })
  async findAll(@Query() filters: FiltersUnbansDto): Promise<UnbanSchema[]> {
    return this.unbansService.findAll(filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a ban by id" })
  @ApiResponse({ type: UnbanSchema })
  async findOne(@Param("id") id: string): Promise<UnbanSchema> {
    return this.unbansService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create an unban" })
  @ApiResponse({ type: UnbanSchema })
  async create(@Body() createUnbanDto: CreateUnbanDto): Promise<UnbanSchema> {
    return this.unbansService.create(createUnbanDto);
  }
}
