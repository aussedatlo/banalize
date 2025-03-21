import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BansService } from "src/bans/services/bans.service";
import { BanEvent } from "src/bans/types/ban-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";

@Injectable()
export class BanEventHandlerService {
  private readonly logger = new Logger(BanEventHandlerService.name);

  constructor(
    private bansService: BansService,
    private eventEmitter: EventEmitter2,
    private queueService: QueueService,
  ) {}

  @OnEvent(Events.BAN_CREATION_REQUESTED)
  handleBanCreationRequested(event: BanEvent) {
    this.queueService.enqueue<BanEvent>(
      event,
      this.createBan.bind(this),
      QueuePriority.HIGH,
    );
  }

  createBan = async (event: BanEvent) => {
    const { ip, config } = event;
    this.logger.log(`Ban ip: ${ip}, config: ${config.param}`);

    const { totalCount } = await this.bansService.findAll({
      ip,
      configId: config._id,
      active: true,
      limit: 0,
    });

    if (totalCount > 0) {
      this.logger.log(`Ban already exists for ${ip}`);
      return;
    }
    // create a new ban
    await this.bansService.create({
      ip,
      timestamp: Date.now(),
      configId: config._id,
    });

    this.eventEmitter.emit(Events.BAN_CREATION_DONE, event);
  };
}
