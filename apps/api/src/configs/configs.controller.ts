import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  ConfigCreatedEvent,
  ConfigRemovedEvent,
} from "src/events/config-event.types";
import { Events } from "src/events/events.enum";
import { ConfigsService } from "./configs.service";
import { CreateConfigDto } from "./dto/create-config.dto";
import { Config } from "./schemas/config.schema";

@ApiTags("configs")
@Controller("configs")
export class ConfigsController {
  constructor(
    private readonly configService: ConfigsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a config" })
  @ApiBody({ type: CreateConfigDto })
  @ApiResponse({ status: 400, description: "Bad Request" })
  async create(@Body() configDto: CreateConfigDto) {
    const result = await this.configService.create(configDto);
    this.eventEmitter.emit(
      Events.CONFIG_CREATED,
      new ConfigCreatedEvent(result),
    );
    return result;
  }

  @Get()
  @ApiOperation({ summary: "Get all configs" })
  @ApiResponse({ type: [Config] })
  async findAll(): Promise<Config[]> {
    return this.configService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a config by id" })
  @ApiResponse({ type: Config })
  async findOne(@Param("id") id: string): Promise<Config> {
    return this.configService.findOne(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a config by id" })
  @ApiResponse({ type: Config })
  async delete(@Param("id") id: string) {
    const result = await this.configService.delete(id);
    this.eventEmitter.emit(
      Events.CONFIG_REMOVED,
      new ConfigRemovedEvent(result._id),
    );
    return result;
  }
}
