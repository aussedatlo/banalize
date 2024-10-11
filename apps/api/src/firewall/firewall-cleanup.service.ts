import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Firewall } from "src/firewall/firewall.interface";
import { FIREWALL_SERVICE } from "src/firewall/firewall.provider";
import { Events } from "src/shared/enums/events.enum";

@Injectable()
export class FirewallCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(FirewallCleanupService.name);
  private bannedIps: string[] = [];

  constructor(@Inject(FIREWALL_SERVICE) private firewallService: Firewall) {}

  @OnEvent(Events.FIREWALL_DENY)
  async onFirewallDeny(event: { ip: string }) {
    if (this.bannedIps.includes(event.ip)) return;
    this.bannedIps.push(event.ip);
  }

  @OnEvent(Events.FIREWALL_ALLOW)
  async onFirewallAllow(event: { ip: string }) {
    this.bannedIps = this.bannedIps.filter((ip) => ip !== event.ip);
  }

  onModuleDestroy() {
    this.logger.log("Cleaning up firewall rules");
    this.bannedIps.forEach(async (ip) => {
      this.logger.log(`Removing firewall rule for IP: ${ip}`);
      await this.firewallService.allowIp(ip);
    });
  }
}
