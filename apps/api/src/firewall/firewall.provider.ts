import { Provider } from "@nestjs/common";
import { UfwFirewallService } from "./ufw-firewall.service";

export const FIREWALL_SERVICE = "FIREWALL_SERVICE"; // Token for the service

export const FirewallProvider: Provider = {
  provide: FIREWALL_SERVICE,
  useFactory: () => {
    const type = process.env.FIREWALL_TYPE || "ufw";

    switch (type) {
      case "ufw":
        return new UfwFirewallService();
      default:
        throw new Error("Unknown firewall type");
    }
  },
};
