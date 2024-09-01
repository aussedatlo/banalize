import { TYPES } from "@/di";
import { IFirewallService } from "@/services/firewall/IFirewallService";
import { inject, injectable } from "inversify";
import { IBackgroundTask } from "./IBackgroundTask";

@injectable()
export class UnbanTask implements IBackgroundTask {
  constructor(
    @inject(TYPES.FirewallService) private firewallService: IFirewallService,
  ) {}

  async execute() {
    console.log("Running UnbanJob...");
    // TODO: Replace this with actual logic to fetch expired bans
    const expiredBans: { ip: string }[] = [];
    for (const ban of expiredBans) {
      this.firewallService.unban(ban.ip);
      console.log(`IP ${ban.ip} unbanned successfully.`);
    }
  }
}
