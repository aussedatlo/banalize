export interface Config {
  id: string;
  name: string;
  param: string;
  regex: string;
  ban_time: number;
  find_time: number;
  max_matches: number;
  ignore_ips: string[];
  /**
   * Optional escalation factor (> 1). When set, each successive ban of the same
   * IP lasts `ban_time * recidive_multiplicator^prior_bans` — exponential
   * growth for repeat offenders. Omitted/undefined keeps a flat `ban_time`.
   */
  recidive_multiplicator?: number;
}

export interface BanEvent {
  id: string;
  config_id: string;
  ip: string;
  timestamp: number;
}

export interface MatchEvent {
  id: string;
  config_id: string;
  ip: string;
  timestamp: number;
  /** The raw log line that matched the config's regex. */
  line: string;
}

export interface UnbanEvent {
  id: string;
  config_id: string;
  ip: string;
  timestamp: number;
}

/** One raw log line from a config's live tail stream. */
export interface TailLine {
  line: string;
  /** Arrival time (ms epoch) — when the core read the line, not a parsed log date. */
  timestamp: number;
}

/** Per-IP aggregate over the audit log (offender leaderboard). */
export interface IpStats {
  ip: string;
  match_count: number;
  ban_count: number;
  config_ids: string[];
  last_seen: number;
}

export interface IpInfo {
  country_code?: string | null;
  country_name?: string | null;
  flag?: string | null;
}

/** Attack aggregates folded by GeoIP country (powers the dashboard map). */
export interface CountryStats {
  /** ISO 3166-1 alpha-2 code. */
  country_code: string;
  country_name?: string | null;
  flag?: string | null;
  match_count: number;
  ban_count: number;
  /** Distinct offending IPs geolocated to this country. */
  ip_count: number;
}

export type NotifierEventType = "ban" | "unban" | "match";

export interface NotifierEmailConfig {
  server: string;
  port: number;
  username: string;
  password: string;
  recipient_email: string;
}

export interface NotifierSignalConfig {
  server: string;
  number: string;
  recipients: string[];
}

/** A notification channel; exactly one of email_config/signal_config is set. */
export interface NotifierConfig {
  id: string;
  events: NotifierEventType[];
  email_config?: NotifierEmailConfig | null;
  signal_config?: NotifierSignalConfig | null;
}

export interface NotifierTestResult {
  success: boolean;
  message: string;
}

export type LiveEventKind = "match" | "ban" | "unban";

/** Domain event pushed by the core over SSE — a hint to refresh, not a record. */
export interface LiveEvent {
  kind: LiveEventKind;
  config_id: string;
  ip: string;
  timestamp: number;
  /** The raw log line that matched; present on `match` events only. */
  line?: string;
}

export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  target: string;
  message: string;
}

/**
 * The single seam every page fetches through, implemented by `HttpDataSource`
 * (talks to /api) and injected via React context, which keeps it trivial to
 * swap for a mock in tests.
 */
export interface DataSource {
  getConfigs(): Promise<Config[]>;
  getConfig(id: string): Promise<Config | undefined>;
  createConfig(config: Config): Promise<Config>;
  updateConfig(config: Config): Promise<Config>;
  deleteConfig(id: string): Promise<void>;
  getMatches(configId?: string): Promise<MatchEvent[]>;
  getBans(configId?: string): Promise<BanEvent[]>;
  getUnbans(configId?: string): Promise<UnbanEvent[]>;
  disableBan(id: string): Promise<UnbanEvent>;
  getLogs(): Promise<LogEntry[]>;
  /** Subscribe to live log entries. Returns an unsubscribe function. */
  streamLogs(onEntry: (entry: LogEntry) => void): () => void;
  /** Country info per IP; unknown IPs map to an empty object. */
  getIpInfos(ips: string[]): Promise<Record<string, IpInfo>>;
  /** Per-IP event aggregates, heaviest offenders first; `since` (ms epoch) restricts the counted events. */
  getIpStats(configId?: string, since?: number): Promise<IpStats[]>;
  /** Attack aggregates folded by GeoIP country; `since` (ms epoch) restricts the counted events. */
  getCountryStats(configId?: string, since?: number): Promise<CountryStats[]>;
  /** New lines of the config's watched file, starting from now. Returns an unsubscribe function. */
  streamConfigLines(
    configId: string,
    onLine: (line: TailLine) => void,
  ): () => void;
  /** Subscribe to live match/ban/unban events. Returns an unsubscribe function. */
  streamEvents(onEvent: (event: LiveEvent) => void): () => void;
  /** The running core version (semver). Stable for the process lifetime. */
  getVersion(): Promise<{ version: string }>;
  /** Liveness probe; resolves only while the core is reachable. */
  getHealth(): Promise<{ status: string }>;
  getNotifiers(): Promise<NotifierConfig[]>;
  createNotifier(notifier: NotifierConfig): Promise<NotifierConfig>;
  updateNotifier(notifier: NotifierConfig): Promise<NotifierConfig>;
  deleteNotifier(id: string): Promise<void>;
  /** Sends a fixed test notification; failure is reported in the result, not thrown. */
  testNotifier(id: string): Promise<NotifierTestResult>;
}
