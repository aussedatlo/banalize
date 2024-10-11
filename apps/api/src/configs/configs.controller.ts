import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  ConfigCreatedEvent,
  ConfigRemovedEvent,
  ConfigUpdatedEvent,
} from "src/configs/types/config-event.types";
import { Events } from "src/shared/enums/events.enum";
import { ConfigsService } from "./configs.service";
import { ConfigCreationDto } from "./dtos/config-creation-dto";
import { ConfigSchema } from "./schemas/config.schema";

@ApiTags("configs")
@Controller("configs")
export class ConfigsController {
  constructor(
    private readonly configService: ConfigsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a config" })
  @ApiBody({ type: ConfigCreationDto })
  @ApiResponse({ status: 400, description: "Bad Request" })
  async create(@Body() configDto: ConfigCreationDto) {
    const result = await this.configService.create(configDto);
    this.eventEmitter.emit(
      Events.CONFIG_CREATION_DONE,
      new ConfigCreatedEvent(result),
    );
    return result;
  }

  @Get()
  @ApiOperation({ summary: "Get all configs" })
  @ApiResponse({ type: [ConfigSchema] })
  async findAll(): Promise<ConfigSchema[]> {
    return this.configService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a config by id" })
  @ApiResponse({ type: ConfigSchema })
  async findOne(@Param("id") id: string): Promise<ConfigSchema> {
    return this.configService.findOne(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a config by id" })
  @ApiResponse({ type: ConfigSchema })
  async delete(@Param("id") id: string) {
    const result = await this.configService.delete(id);
    this.eventEmitter.emit(
      Events.CONFIG_REMOVE_DONE,
      new ConfigRemovedEvent(result._id),
    );
    return result;
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a config by id" })
  @ApiBody({ type: ConfigCreationDto })
  @ApiResponse({ type: ConfigSchema })
  async update(@Param("id") id: string, @Body() configDto: ConfigCreationDto) {
    const result = await this.configService.update(id, configDto);

    this.eventEmitter.emit(
      Events.CONFIG_UPDATE_DONE,
      new ConfigUpdatedEvent(result),
    );

    return result;
  }
}
