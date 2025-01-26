import { Provider } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { IptablesFirewallService } from "./iptables-firewall.service";

export const FIREWALL_SERVICE = "FIREWALL_SERVICE"; // Token for the service

export const FirewallProvider: Provider = {
  provide: FIREWALL_SERVICE,
  useFactory: (eventEmitter: EventEmitter2) => {
    const type = process.env.BANALIZE_API_FIREWALL_TYPE || "iptables";

    switch (type) {
      case "iptables":
        return new IptablesFirewallService(eventEmitter);
      default:
        throw new Error("Unknown firewall type");
    }
  },
  inject: [EventEmitter2],
};
