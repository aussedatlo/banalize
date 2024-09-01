import { injectable } from "inversify";
import { IFirewallService } from "./IFirewallService";

@injectable()
export class IPTablesService implements IFirewallService {
  ban(ip: string): void {
    console.log(`Banning IP: ${ip}`);
  }

  unban(ip: string): void {
    console.log(`Unbanning IP: ${ip}`);
  }
}
