import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotifierConfigDto } from "./dtos/notifier-config-creation.dto";
import { NotifierConfigService } from "./services/notifier-config-service.service";
import { NotifierTestService } from "./services/notifier-test-service.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifierConfigService: NotifierConfigService,
    private readonly notifierTestService: NotifierTestService,
  ) {}

  @Get()
  async findAll() {
    return this.notifierConfigService.findAll();
  }

  @Get(":id")
  async findOne(id: string) {
    return this.notifierConfigService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a config" })
  @ApiBody({ type: NotifierConfigDto })
  async create(@Body() dto: NotifierConfigDto) {
    return this.notifierConfigService.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: NotifierConfigDto) {
    return this.notifierConfigService.update(id, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.notifierConfigService.delete(id);
  }

  @Post(":id/test")
  async test(@Param("id") id: string) {
    return this.notifierTestService.execute(id);
  }
}
