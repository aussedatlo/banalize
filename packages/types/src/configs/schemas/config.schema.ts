import { WatcherType } from "src/watchers/enums/watcher-type.enum";

export type ConfigSchema = {
  _id: string;
  name: string;
  param: string;
  regex: string;
  banTime: number;
  findTime: number;
  maxMatches: number;
  watcherType: WatcherType;
  ignoreIps?: string[];
  paused?: boolean;
};
