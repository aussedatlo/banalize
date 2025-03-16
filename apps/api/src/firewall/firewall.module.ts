import { Module } from "@nestjs/common";
import { SharedModule } from "src/shared/shared.module";
import { FirewallEventHandlerService } from "./firewall-event-handler.service";
import { FirewallProvider } from "./firewall.provider";

@Module({
  imports: [SharedModule],
  providers: [FirewallProvider, FirewallEventHandlerService],
})
export class FirewallModule {}
