import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BansService } from "src/bans/bans.service";
import { ConfigsService } from "src/configs/configs.service";
import { Events } from "src/events/events.enum";
import { UnbanEvent } from "src/events/unban-event.types";

@Injectable()
export class BanCleanupService implements OnModuleInit {
  private readonly logger = new Logger(BanCleanupService.name);

  constructor(
    private readonly bansService: BansService,
    private readonly configsService: ConfigsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.handleCron();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.log("Running ban expiration cleanup task...");
    const timestamp = new Date().getTime();

    const activebans = await this.bansService.findAll({ active: true });
    this.logger.debug(`Found ${activebans.length} active bans`);

    for (const ban of activebans) {
      const config = await this.configsService.findOne(ban.configId);

      if (ban.timestamp + config.banTime * 1000 > timestamp) {
        continue;
      }

      this.logger.log(`Removing expired ban for IP: ${ban.ip}`);
      await this.bansService.update(ban._id, { active: false });

      this.eventEmitter.emit(
        Events.UNBAN_CREATE_REQUESTED,
        new UnbanEvent(ban.ip, ban.configId, ban._id),
      );
      this.eventEmitter.emit(Events.FIREWALL_ALLOW, { ip: ban.ip });
    }
  }
}
