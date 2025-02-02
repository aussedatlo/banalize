import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Events } from "src/shared/enums/events.enum";
import { UnbanCreationDto } from "./dtos/unban-creation.dto";
import { UnbanFiltersDto } from "./dtos/unban-filters.dto";
import { UnbanSchema } from "./schemas/unban.schema";
import { UnbansService } from "./services/unbans.service";

@ApiTags("unbans")
@Controller("unbans")
export class UnbansController {
  constructor(
    private readonly unbansService: UnbansService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get all unbans" })
  @ApiResponse({ type: [UnbanSchema] })
  async findAll(@Query() filters: UnbanFiltersDto): Promise<UnbanSchema[]> {
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
  async create(@Body() createUnbanDto: UnbanCreationDto): Promise<UnbanSchema> {
    const unban = await this.unbansService.create(createUnbanDto);

    if (unban) {
      this.eventEmitter.emit(Events.FIREWALL_ALLOW, { ip: unban.ip });
    }
    return unban;
  }
}
