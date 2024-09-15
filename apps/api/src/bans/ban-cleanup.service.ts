import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Events } from "src/events/events.enum";
import { BansService } from "./bans.service";

@Injectable()
export class BanCleanupService {
  private readonly logger = new Logger(BanCleanupService.name);

  constructor(
    private readonly bansService: BansService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log("Running ban expiration cleanup task...");
    const timestamp = new Date().getTime();

    const activebans = await this.bansService.findAll({ active: true });
    this.logger.debug(`Found ${activebans.length} active bans`);

    for (const ban of activebans) {
      if (ban.timestamp + ban.banTime * 1000 > timestamp) {
        continue;
      }

      this.logger.log(`Removing expired ban for IP: ${ban.ip}`);
      await this.bansService.update(ban._id, { active: false });
      this.eventEmitter.emit(Events.FIREWALL_ALLOW, { ip: ban.ip });
    }
  }
}
