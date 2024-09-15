import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BanEvent } from "src/events/ban-event.types";
import { Events } from "src/events/events.enum";
import { BansService } from "./bans.service";

@Injectable()
export class BanEventHandlerService {
  private readonly logger = new Logger(BanEventHandlerService.name);

  constructor(
    private bansService: BansService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(Events.BAN_CREATE)
  async handleBan(event: BanEvent) {
    const { ip, config } = event;
    this.logger.log(`Ban ip: ${ip}, config: ${config.param}`);

    // disable all current bans
    const currentBans = await this.bansService.findAll({
      ip,
      configId: config._id,
      active: true,
    });
    currentBans.forEach((ban) => {
      this.bansService.update(ban._id, {
        active: false,
      });
    });

    // create a new ban
    this.bansService.create({
      ip,
      timestamp: new Date().getTime(),
      banTime: config.banTime,
      configId: config._id,
    });

    this.eventEmitter.emit(Events.FIREWALL_DENY, { ip });
  }
}
