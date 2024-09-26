import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BansService } from "src/bans/bans.service";
import { BanEvent } from "src/events/ban-event.types";
import { Events } from "src/events/events.enum";

@Injectable()
export class BanEventHandlerService {
  private readonly logger = new Logger(BanEventHandlerService.name);

  constructor(
    private bansService: BansService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(Events.BAN_CREATION_REQUESTED)
  async handleBan(event: BanEvent) {
    const { ip, config } = event;
    this.logger.log(`Ban ip: ${ip}, config: ${config.param}`);

    // disable all current bans
    const currentBans = await this.bansService.findAll({
      ip,
      configId: config._id,
      active: true,
    });

    if (currentBans.length > 0) {
      this.logger.log(`Ban already exists for ${ip}`);
      return;
    }
    // create a new ban
    await this.bansService.create({
      ip,
      timestamp: new Date().getTime(),
      banTime: config.banTime,
      configId: config._id,
    });

    this.eventEmitter.emit(Events.FIREWALL_DENY, { ip });
    this.eventEmitter.emit(Events.BAN_CREATION_DONE, event);
  }
}
