export interface Firewall {
  denyIp(ip: string): Promise<void>;
  allowIp(ip: string): Promise<void>;
}
