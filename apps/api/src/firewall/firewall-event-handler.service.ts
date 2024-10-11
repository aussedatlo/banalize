import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Events } from "src/shared/enums/events.enum";
import { Firewall } from "./firewall.interface";
import { FIREWALL_SERVICE } from "./firewall.provider";

@Injectable()
export class FirewallEventHandlerService {
  private readonly logger = new Logger(FirewallEventHandlerService.name);

  constructor(@Inject(FIREWALL_SERVICE) private firewallService: Firewall) {}

  @OnEvent(Events.FIREWALL_DENY)
  async handleFirewallAdd(event: { ip: string }) {
    const { ip } = event;
    this.logger.log(`Adding firewall rule for IP: ${ip}`);
    await this.firewallService.denyIp(ip);
  }

  @OnEvent(Events.FIREWALL_ALLOW)
  async handleFirewallRemove(event: { ip: string }) {
    const { ip } = event;
    this.logger.log(`Removing firewall rule for IP: ${ip}`);
    await this.firewallService.allowIp(ip);
  }
}
