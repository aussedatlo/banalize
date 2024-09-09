import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { BansService } from "./bans.service";
import { Ban } from "./schemas/ban.schema";

@ApiTags("bans")
@Controller("bans")
export class BansController {
  constructor(private readonly bansService: BansService) {}

  @Get()
  @ApiOperation({ summary: "Get all bans" })
  @ApiResponse({ type: [Ban] })
  async findAll(): Promise<Ban[]> {
    return this.bansService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a ban by id" })
  @ApiResponse({ type: Ban })
  async findOne(@Param("id") id: string): Promise<Ban> {
    return this.bansService.findOne(id);
  }
}
