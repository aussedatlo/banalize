import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { exec } from "child_process";
import { Events } from "src/shared/enums/events.enum";
import { promisify } from "util";
import { Firewall } from "./firewall.interface";

@Injectable()
export class IptablesFirewallService
  implements Firewall, OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(IptablesFirewallService.name);
  private readonly chain = "banalize";
  private readonly link = process.env.BANALIZE_API_FIREWALL_CHAIN ?? "INPUT";
  private bannedIps: string[] = [];

  constructor(private readonly eventEmitter: EventEmitter2) {}

  private execAsync = promisify(exec);

  async onModuleDestroy(): Promise<void> {
    this.logger.log("Cleaning up firewall rules");
    await this.flushChain();
    await this.unlinkChain();
    await this.deleteChain();
    this.bannedIps = [];
    this.logger.log("Firewall rules cleaned up");
  }

  async onModuleInit() {
    this.logger.log("Initializing firewall");
    await this.createChain();
    await this.linkChain();
    await this.flushChain();

    // Emit the event in the next tick to avoid circular dependencies
    setTimeout(() => {
      this.eventEmitter.emit(Events.FIREWALL_READY);
    }, 1000); // wait a little bit to make sure the init is done
  }

  async denyIp(ip: string): Promise<void> {
    if (this.bannedIps.includes(ip)) return;
    this.bannedIps.push(ip);

    const command = `iptables -A ${this.chain} -s ${ip}/32 -j REJECT --reject-with icmp-port-unreachable`;
    await this.executeCommand(command);
  }

  async allowIp(ip: string): Promise<void> {
    if (!this.bannedIps.includes(ip)) return;
    this.bannedIps = this.bannedIps.filter((bannedIp) => bannedIp !== ip);

    const command = `iptables -D ${this.chain} -s ${ip}/32 -j REJECT --reject-with icmp-port-unreachable`;
    await this.executeCommand(command);
  }

  private async linkChain(): Promise<void> {
    const command = `iptables -I ${this.link} -j ${this.chain}`;
    await this.executeCommand(command);
  }

  private async unlinkChain(): Promise<void> {
    const command = `iptables-save | sed '/^-A ${this.link} -j ${this.chain}$/d' | iptables-restore`;
    await this.executeCommand(command);
  }

  private async createChain(): Promise<void> {
    const command = `iptables -N ${this.chain}`;
    await this.executeCommand(command);
  }

  private async deleteChain(): Promise<void> {
    const command = `iptables -X ${this.chain}`;
    await this.executeCommand(command);
  }

  private async flushChain(): Promise<void> {
    const command = `iptables -F ${this.chain}`;
    await this.executeCommand(command);
  }

  private async executeCommand(command: string): Promise<void> {
    try {
      this.logger.debug(`Executing: ${command}`);
      await this.execAsync(command);
    } catch (error) {
      this.logger.error(`Failed to execute: ${command}`);
      this.logger.error(error);
    }
  }
}
