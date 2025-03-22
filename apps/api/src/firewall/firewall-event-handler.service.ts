import { Inject, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { Firewall } from "./firewall.interface";
import { FIREWALL_SERVICE } from "./firewall.provider";

@Injectable()
export class FirewallEventHandlerService {
  private readonly logger: Logger = new Logger(
    FirewallEventHandlerService.name,
  );

  constructor(
    @Inject(FIREWALL_SERVICE) private firewallService: Firewall,
    private queueService: QueueService,
  ) {}

  @OnEvent(Events.FIREWALL_DENY)
  async handleFirewallAdd(event: { ip: string }) {
    this.queueService.enqueue<{ ip: string }>(
      event,
      this.deny.bind(this),
      QueuePriority.VERY_HIGH,
    );
  }

  async deny(event: { ip: string }) {
    const { ip } = event;
    await this.firewallService.denyIp(ip);
  }

  @OnEvent(Events.FIREWALL_ALLOW)
  async handleFirewallRemove(event: { ip: string }) {
    this.queueService.enqueue<{ ip: string }>(
      event,
      this.allow.bind(this),
      QueuePriority.MEDIUM,
    );
  }

  async allow(event: { ip: string }) {
    const { ip } = event;
    await this.firewallService.allowIp(ip);
  }
}
