import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Events } from "src/events/events.enum";
import { UnbanEvent } from "src/events/unban-event.types";
import { BansService } from "./bans.service";
import { FiltersBansDto } from "./dto/filters-ban.dto";
import { BanSchema } from "./schemas/ban.schema";

@ApiTags("bans")
@Controller("bans")
export class BansController {
  constructor(
    private readonly bansService: BansService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
