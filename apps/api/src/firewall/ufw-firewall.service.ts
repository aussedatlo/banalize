import { Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import { Firewall } from "./firewall.interface";

export class UfwFirewallService implements Firewall {
  private readonly logger = new Logger(UfwFirewallService.name);
  private execAsync = promisify(exec);

  async denyIp(ip: string): Promise<void> {
    try {
      const command = `ufw deny from ${ip}`;
      this.logger.log(`Executing: ${command}`);
      await this.execAsync(command);
    } catch (error) {
      this.logger.error(`Failed to add UFW rule: ${error.message}`);
    }
  }

  async allowIp(ip: string): Promise<void> {
    try {
      const command = `ufw delete deny from ${ip}`;
      this.logger.log(`Executing: ${command}`);
      await this.execAsync(command);
    } catch (error) {
      this.logger.error(`Failed to remove UFW rule: ${error.message}`);
    }
  }
}
