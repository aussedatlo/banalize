import { TYPES } from "@/di";
import { MatchEventRepository } from "@/repositories/MatchEventRepository";
import { IFirewallService } from "@/services/firewall/IFirewallService";
import { inject, injectable } from "inversify";

@injectable()
export class MatchEventHandler {
  constructor(
    @inject(TYPES.MatchEventRepository)
    private eventRepository: MatchEventRepository,
    @inject(TYPES.FirewallService) private firewallService: IFirewallService,
  ) {}

  async handle(ip: string, regex: string): Promise<void> {
    await this.eventRepository.add(ip, regex);
    await this.firewallService.ban(ip);
  }
}
