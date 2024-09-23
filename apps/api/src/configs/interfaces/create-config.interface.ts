import { WatcherType } from "src/configs/enums/watcher-type";

export interface CreateConfig {
  param: string;
  regex: string;
  banTime: number;
  findTime: number;
  maxMatches: number;
  watcherType: WatcherType;
  ignoreIps?: string[];
}
