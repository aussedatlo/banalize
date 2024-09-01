import { exec } from "child_process";
import { injectable } from "inversify";
import { EitherAsync, Right } from "purify-ts";
import { IFirewallService } from "./IFirewallService";

@injectable()
export class IPTablesService implements IFirewallService {
  ban(ip: string): EitherAsync<Error, boolean> {
    console.log(`Banning IP: ${ip}`);
    const command = `iptables -A ${process.env.FIREWALL_CHAIN ?? "INPUT"} -s ${ip} -j REJECT --reject-with icmp-port-unreachable`;
    return EitherAsync.fromPromise(
      () =>
        new Promise((resolve, reject) => {
          exec(command, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve(Right(true));
            }
          });
        }),
    );
  }

  unban(ip: string): EitherAsync<Error, boolean> {
    console.log(`Unbanning IP: ${ip}`);
    const command = `iptables -D ${process.env.FIREWALL_CHAIN ?? "INPUT"} -s ${ip} -j REJECT --reject-with icmp-port-unreachable`;
    return EitherAsync.fromPromise(
      () =>
        new Promise((resolve, reject) => {
          exec(command, (error) => {
            if (error) {
              reject(error);
            } else {
              resolve(Right(true));
            }
          });
        }),
    );
  }
}
