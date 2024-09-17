import { Module } from "@nestjs/common";
import { FirewallCleanupService } from "src/firewall/firewall-cleanup.service";
import { FirewallEventHandlerService } from "./firewall-event-handler.service";
import { FirewallProvider } from "./firewall.provider";

@Module({
  providers: [
    FirewallProvider,
    FirewallEventHandlerService,
    FirewallCleanupService,
  ],
})
export class FirewallModule {}
