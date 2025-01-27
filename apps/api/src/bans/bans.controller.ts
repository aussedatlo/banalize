import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Events } from "src/shared/enums/events.enum";
import { UnbanEvent } from "src/unbans/types/unban-event.types";
import { ConfigsService } from "../configs/configs.service";
import { BanCreationDto } from "./dtos/ban-creation.dto";
import { BanFiltersDto } from "./dtos/ban-filters.dto";
import { BanSchema } from "./schemas/ban.schema";
import { BansService } from "./services/bans.service";

@ApiTags("bans")
@Controller("bans")
export class BansController {
  constructor(
    private readonly bansService: BansService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configsService: ConfigsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new ban" })
  @ApiResponse({ type: BanSchema })
  async create(@Body() banCreationDto: BanCreationDto): Promise<BanSchema> {
    const config = await this.configsService.findOne(banCreationDto.configId);
    if (!config) {
      throw new Error("Config not found");
    }
    // create a new ban
    return await this.bansService.create({
      ip: banCreationDto.ip,
      timestamp: banCreationDto.timestamp,
      configId: config._id,
    });
  }

  @Get()
  @ApiOperation({ summary: "Get all bans" })
  @ApiResponse({ type: [BanSchema] })
  async findAll(
    @Query() filters: BanFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const { bans, totalCount } = await this.bansService.findAll(filters);
    res.setHeader("X-Total-Count", totalCount);
    res.json(bans);
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
    const ban = await this.bansService.update(id, { active: false });

    if (ban) {
      this.eventEmitter.emit(
        Events.UNBAN_CREATE_REQUESTED,
        new UnbanEvent(ban.ip, ban.configId, ban._id),
      );
    }
    return ban;
  }
}
