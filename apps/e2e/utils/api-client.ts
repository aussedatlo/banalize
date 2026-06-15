import { CORE_URL } from "./config";

/** Mirrors the core's ConfigResponse (durations in milliseconds). */
export interface Config {
  id: string;
  name: string;
  param: string;
  regex: string;
  ban_time: number;
  find_time: number;
  max_matches: number;
  ignore_ips: string[];
  /** Optional escalation factor (> 1) for repeat offenders. */
  recidive_multiplicator?: number;
}

export interface BanEvent {
  id: string;
  config_id: string;
  ip: string;
  timestamp: number;
}

export interface UnbanEvent {
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
  line: string;
}

export interface NotifierConfig {
  id: string;
  events: string[];
  email_config?: unknown;
  signal_config?: unknown;
}

/**
 * Thin REST client for the core, used to seed and tear down state directly
 * (out-of-band of the UI) so specs stay isolated and fast.
 */
export class ApiClient {
  constructor(private readonly baseUrl: string = CORE_URL) {}

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      throw new Error(
        `${init?.method ?? "GET"} ${path} -> ${res.status} ${res.statusText}`,
      );
    }
    return res.json() as Promise<T>;
  }

  listConfigs(): Promise<Config[]> {
    return this.json<Config[]>("/api/configs");
  }

  createConfig(config: Config): Promise<Config> {
    return this.json<Config>("/api/configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  /** Update an existing config in place (PUT); restarts its watcher. */
  updateConfig(config: Config): Promise<Config> {
    return this.json<Config>(`/api/configs/${config.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  async deleteConfig(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/configs/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`DELETE /api/configs/${id} -> ${res.status}`);
    }
  }

  listBans(): Promise<BanEvent[]> {
    return this.json<BanEvent[]>("/api/bans");
  }

  listUnbans(): Promise<UnbanEvent[]> {
    return this.json<UnbanEvent[]>("/api/unbans");
  }

  /** Lift a ban by its event id (manual unban); keeps recidive history. */
  disableBan(id: string): Promise<UnbanEvent> {
    return this.json<UnbanEvent>(`/api/bans/${id}/disable`, { method: "POST" });
  }

  listMatches(): Promise<MatchEvent[]> {
    return this.json<MatchEvent[]>("/api/matches");
  }

  listNotifiers(): Promise<NotifierConfig[]> {
    return this.json<NotifierConfig[]>("/api/notifiers");
  }

  async deleteNotifier(id: string): Promise<void> {
    const res = await fetch(
      `${this.baseUrl}/api/notifiers/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`DELETE /api/notifiers/${id} -> ${res.status}`);
    }
  }

  /** Remove every config — deletes its watcher, matches and active bans too. */
  async deleteAllConfigs(): Promise<void> {
    const configs = await this.listConfigs();
    await Promise.all(configs.map((c) => this.deleteConfig(c.id)));
  }

  async deleteAllNotifiers(): Promise<void> {
    const notifiers = await this.listNotifiers();
    await Promise.all(notifiers.map((n) => this.deleteNotifier(n.id)));
  }

  /** Wipe all UI-visible state created by a spec. */
  async reset(): Promise<void> {
    await this.deleteAllConfigs();
    await this.deleteAllNotifiers();
  }
}
