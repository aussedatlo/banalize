import { Controller, Get, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { EventFiltersDto } from "./dtos/event-filters.dto";
import { EventResponse } from "./responses/event-response";
import { EventsService } from "./services/events.service";

@Controller("events")
@ApiTags("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: "Get all events for a specific config" })
  @ApiResponse({ type: [EventResponse] })
  async findAllByConfigId(
    @Query() filters: EventFiltersDto,
    @Res() res: Response,
  ): Promise<void> {
    const { events, totalCount } =
      await this.eventsService.findAllByConfigId(filters);
    res.setHeader("X-Total-Count", totalCount);
    res.json(events);
  }
}
