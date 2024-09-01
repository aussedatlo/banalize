export interface IFirewallService {
  ban(ip: string): void;
  unban(ip: string): void;
}
