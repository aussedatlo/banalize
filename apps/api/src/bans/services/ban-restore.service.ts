import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BansService } from "src/bans/services/bans.service";
import { Events } from "src/shared/enums/events.enum";

@Injectable()
export class BanRestoreService {
  private readonly logger = new Logger(BanRestoreService.name);

  constructor(
    private bansService: BansService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(Events.FIREWALL_READY)
  async handleFirewallReady() {
    const { bans } = await this.bansService.findAll({ active: true });

    if (!bans.length) {
      this.logger.log("No bans to restore");
      return;
    }

    this.logger.log(`Restoring bans: ${bans.map((ban) => ban.ip).join(", ")}`);

    for (const ban of bans) {
      this.logger.debug(`Restoring ban for IP: ${ban.ip}`);
      this.eventEmitter.emit(Events.FIREWALL_DENY, { ip: ban.ip });
    }
  }
}
