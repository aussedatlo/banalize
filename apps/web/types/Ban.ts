export type Ban = {
  _id: string;
  ip: string;
  timestamp: number;
  banTime: number;
  configId: string;
  active: boolean;
};
