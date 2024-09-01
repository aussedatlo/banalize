import { EitherAsync } from "purify-ts";

export interface IFirewallService {
  ban(ip: string): EitherAsync<Error, boolean>;
  unban(ip: string): EitherAsync<Error, boolean>;
}
