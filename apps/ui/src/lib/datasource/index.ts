import { HttpDataSource } from "./http";
import type { DataSource } from "./types";

/** The active data source for this build. */
export const dataSource: DataSource = new HttpDataSource();

export { useDataSource } from "./context";
export { ApiError } from "./http";
export { DataSourceProvider } from "./provider";
export type {
  BanEvent,
  Config,
  CountryStats,
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
  RegexValidation,
  TailLine,
  UnbanEvent,
} from "./types";
