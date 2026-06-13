import { HttpDataSource } from "./http";
import type { DataSource } from "./types";

/** The active data source for this build. */
export const dataSource: DataSource = new HttpDataSource();

export { DataSourceProvider, useDataSource } from "./context";
export { ApiError } from "./http";
export type {
  BanEvent,
  Config,
  DataSource,
  IpInfo,
  IpStats,
  LiveEvent,
  LiveEventKind,
  LogEntry,
  LogLevel,
  MatchEvent,
  NotifierConfig,
  NotifierEmailConfig,
  NotifierEventType,
  NotifierSignalConfig,
  NotifierTestResult,
  TailLine,
  UnbanEvent,
} from "./types";
