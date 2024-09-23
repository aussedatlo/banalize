type TimeStats = {
  [key: string]: number;
};
export type Stats = {
  bans?: {
    data: TimeStats;
  };
  matches?: {
    data: TimeStats;
  };
};
