import { Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import { Firewall } from "./firewall.interface";

export class IptablesFirewallService
  implements Firewall, OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(IptablesFirewallService.name);
  private readonly chain = "banalize";
  private readonly link = process.env.BANALIZE_API_FIREWALL_CHAIN ?? "INPUT";
  private bannedIps: string[] = [];

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
  }

  async denyIp(ip: string): Promise<void> {
    if (this.bannedIps.includes(ip)) return;

    const command = `iptables -A ${this.chain} -s ${ip}/32 -j REJECT --reject-with icmp-port-unreachable`;
    this.executeCommand(command);
    this.bannedIps.push(ip);
  }

  async allowIp(ip: string): Promise<void> {
    if (!this.bannedIps.includes(ip)) return;

    const command = `iptables -D ${this.chain} -s ${ip}/32 -j REJECT --reject-with icmp-port-unreachable`;
    this.executeCommand(command);

    this.bannedIps = this.bannedIps.filter((bannedIp) => bannedIp !== ip);
  }

  private async linkChain(): Promise<void> {
    const command = `iptables -I ${this.link} -j ${this.chain}`;
    this.executeCommand(command);
  }

  private async unlinkChain(): Promise<void> {
    const command = `iptables -D ${this.link} -j ${this.chain}`;
    this.executeCommand(command);
  }

  private async createChain(): Promise<void> {
    const command = `iptables -N ${this.chain}`;
    this.executeCommand(command);
  }

  private async deleteChain(): Promise<void> {
    const command = `iptables -X ${this.chain}`;
    this.executeCommand(command);
  }

  private async flushChain(): Promise<void> {
    const command = `iptables -F ${this.chain}`;
    this.executeCommand(command);
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
