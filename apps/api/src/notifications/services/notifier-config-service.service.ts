import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { NotifierConfigDto } from "src/notifications/dtos/notifier-config-creation.dto";
import { NotifierConfigSchema } from "src/notifications/schemas/notifier-config.schema";
import { Events } from "src/shared/enums/events.enum";

@Injectable()
export class NotifierConfigService {
  constructor(
    @InjectModel(NotifierConfigSchema.name)
    private readonly notifierConfigModel: Model<NotifierConfigSchema>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: NotifierConfigDto) {
    const result = await this.notifierConfigModel.create(dto);
    this.eventEmitter.emit(Events.NOTIFY_CONFIG_CREATION_DONE);
    return result;
  }

  async update(id: string, dto: NotifierConfigDto) {
    const result = this.notifierConfigModel.findByIdAndUpdate(id, dto).exec();
    this.eventEmitter.emit(Events.NOTIFY_CONFIG_UPDATE_DONE);
    return result;
  }

  async findAll() {
    return this.notifierConfigModel.find().exec();
  }

  async findOne(id: string) {
    return this.notifierConfigModel.findById(id).exec();
  }

  async delete(id: string) {
    const result = this.notifierConfigModel.findByIdAndDelete(id).exec();
    this.eventEmitter.emit(Events.NOTIFY_CONFIG_DELETE_DONE);
    return result;
  }
}
