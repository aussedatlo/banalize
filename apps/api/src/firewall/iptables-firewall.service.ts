import { Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import { Firewall } from "./firewall.interface";

export class IptablesFirewallService implements Firewall {
  private readonly logger = new Logger(IptablesFirewallService.name);
  private readonly chain = process.env.BANALIZE_API_FIREWALL_CHAIN ?? "INPUT";
  private execAsync = promisify(exec);

  // Block an IP using iptables
  async denyIp(ip: string): Promise<void> {
    try {
      // iptables command to drop packets from a specific IP
      const command = `iptables -A ${this.chain} -s ${ip} -j DROP`;
      this.logger.log(`Executing: ${command}`);
      await this.execAsync(command);
    } catch (error) {
      this.logger.error(`Failed to add iptables rule: ${error.message}`);
    }
  }

  // Allow an IP by removing the blocking rule
  async allowIp(ip: string): Promise<void> {
    try {
      // iptables command to remove the rule blocking the IP
      const command = `iptables -D ${this.chain} -s ${ip} -j DROP`;
      this.logger.log(`Executing: ${command}`);
      await this.execAsync(command);
    } catch (error) {
      this.logger.error(`Failed to remove iptables rule: ${error.message}`);
    }
  }
}
