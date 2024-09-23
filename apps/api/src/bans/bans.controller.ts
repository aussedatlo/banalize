import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BansService } from "./bans.service";
import { FiltersBansDto } from "./dto/filters-ban.dto";
import { BanSchema } from "./schemas/ban.schema";

@ApiTags("bans")
@Controller("bans")
export class BansController {
  constructor(private readonly bansService: BansService) {}

  @Get()
  @ApiOperation({ summary: "Get all bans" })
  @ApiResponse({ type: [BanSchema] })
  async findAll(@Query() filters: FiltersBansDto): Promise<BanSchema[]> {
    return this.bansService.findAll(filters);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a ban by id" })
  @ApiResponse({ type: BanSchema })
  async findOne(@Param("id") id: string): Promise<BanSchema> {
    return this.bansService.findOne(id);
  }

  @Patch(":id/disable")
  @ApiOperation({ summary: "Disable a ban" })
  @ApiResponse({ type: BanSchema })
  async disable(@Param("id") id: string): Promise<BanSchema> {
    return this.bansService.update(id, { active: false });
  }
}
