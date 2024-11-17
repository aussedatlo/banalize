import { Module } from "@nestjs/common";
import { FirewallEventHandlerService } from "./firewall-event-handler.service";
import { FirewallProvider } from "./firewall.provider";

@Module({
  providers: [FirewallProvider, FirewallEventHandlerService],
})
export class FirewallModule {}
