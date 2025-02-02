export type BanSchema = {
  _id: string;
  ip: string;
  timestamp: number;
  configId: string;
  active: boolean;
  isManual: boolean;
  matches?: string[];
};
