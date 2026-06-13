import type {
  BanEvent,
  Config,
  DataSource,
  IpInfo,
  IpStats,
  LiveEvent,
  LogEntry,
  MatchEvent,
  NotifierConfig,
  NotifierTestResult,
  TailLine,
  UnbanEvent,
} from "./types";

/** HTTP failure carrying the status code so callers can map it to a message. */
export class ApiError extends Error {
  constructor(public readonly status: number, statusText: string) {
    super(`HTTP ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new ApiError(res.status, res.statusText);
  return res.json() as Promise<T>;
}

/** Talks to the banalize-core REST API (proxied to :5040 in dev). */
export class HttpDataSource implements DataSource {
  getConfigs() {
    return fetchJson<Config[]>("/api/configs");
  }

  async getConfig(id: string) {
    try {
      return await fetchJson<Config>(`/api/configs/${id}`);
    } catch {
      return undefined;
    }
  }

  createConfig(config: Config) {
    return fetchJson<Config>("/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  updateConfig(config: Config) {
    return fetchJson<Config>(`/api/configs/${config.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  async deleteConfig(id: string) {
    const res = await fetch(`/api/configs/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  async getMatches(configId?: string) {
    const matches = await fetchJson<MatchEvent[]>(
      configId ? `/api/matches/${configId}` : "/api/matches",
    );
    // Backends predating the line field omit it; normalize so the UI can
    // rely on the contract.
    return matches.map((m) => ({ ...m, line: m.line ?? "" }));
  }

  getBans(configId?: string) {
    return fetchJson<BanEvent[]>(
      configId ? `/api/bans/${configId}` : "/api/bans",
    );
  }

  getUnbans(configId?: string) {
    return fetchJson<UnbanEvent[]>(
      configId ? `/api/unbans/${configId}` : "/api/unbans",
    );
  }

  disableBan(id: string) {
    return fetchJson<UnbanEvent>(`/api/bans/${id}/disable`, { method: "POST" });
  }

  getIpInfos(ips: string[]) {
    if (ips.length === 0) return Promise.resolve({});
    return fetchJson<Record<string, IpInfo>>(
      `/api/ip-infos?ips=${encodeURIComponent(ips.join(","))}`,
    );
  }

  getIpStats(configId?: string, since?: number) {
    const params = new URLSearchParams();
    if (configId) params.set("config_id", configId);
    if (since !== undefined) params.set("since", String(since));
    const qs = params.toString();
    return fetchJson<IpStats[]>(qs ? `/api/ips/stats?${qs}` : "/api/ips/stats");
  }

  getLogs() {
    return fetchJson<LogEntry[]>("/api/logs");
  }

  streamLogs(onEntry: (entry: LogEntry) => void) {
    const es = new EventSource("/api/logs/stream");
    es.onmessage = (e: MessageEvent) => {
      onEntry(JSON.parse(e.data as string) as LogEntry);
    };
    return () => es.close();
  }

  streamConfigLines(configId: string, onLine: (line: TailLine) => void) {
    const es = new EventSource(
      `/api/configs/${encodeURIComponent(configId)}/tail`,
    );
    es.onmessage = (e: MessageEvent) => {
      onLine(JSON.parse(e.data as string) as TailLine);
    };
    return () => es.close();
  }

  streamEvents(onEvent: (event: LiveEvent) => void) {
    const es = new EventSource("/api/events/stream");
    es.onmessage = (e: MessageEvent) => {
      onEvent(JSON.parse(e.data as string) as LiveEvent);
    };
    return () => es.close();
  }

  getNotifiers() {
    return fetchJson<NotifierConfig[]>("/api/notifiers");
  }

  createNotifier(notifier: NotifierConfig) {
    return fetchJson<NotifierConfig>("/api/notifiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifier),
    });
  }

  updateNotifier(notifier: NotifierConfig) {
    return fetchJson<NotifierConfig>(
      `/api/notifiers/${encodeURIComponent(notifier.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifier),
      },
    );
  }

  async deleteNotifier(id: string) {
    const res = await fetch(`/api/notifiers/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  }

  testNotifier(id: string) {
    return fetchJson<NotifierTestResult>(
      `/api/notifiers/${encodeURIComponent(id)}/test`,
      { method: "POST" },
    );
  }
}
