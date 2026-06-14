import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { LOG_DIR } from "./config";

/**
 * Writes lines into the log directory the core watches (bind-mounted into the
 * container at /var/log/banalize-e2e). The core's file watcher seeks to EOF when
 * a config is created, so a file must exist *before* its config is created and
 * lines appended *after* — only then are they detected.
 */
export class LogInjector {
  constructor(private readonly dir: string = LOG_DIR) {}

  private filePath(file: string): string {
    return path.join(this.dir, file);
  }

  /** Create (or truncate) the log file so the watcher has something to tail. */
  async create(file: string): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.filePath(file), "");
  }

  /** Append a single raw line. */
  async appendLine(file: string, line: string): Promise<void> {
    await appendFile(
      this.filePath(file),
      line.endsWith("\n") ? line : `${line}\n`,
    );
  }

  async appendLines(file: string, lines: string[]): Promise<void> {
    await appendFile(this.filePath(file), lines.map((l) => `${l}\n`).join(""));
  }

  /**
   * Append `count` sshd-style failed-login lines for `ip`, matching the regex
   * `Failed password .* from <IP>`.
   */
  async failedLogin(file: string, ip: string, count: number): Promise<void> {
    const lines = Array.from(
      { length: count },
      (_, i) =>
        `${new Date().toISOString()} sshd[${1000 + i}]: Failed password for root from ${ip} port 4242 ssh2`,
    );
    await this.appendLines(file, lines);
  }
}

/** The regex (with the <IP> placeholder) that LogInjector.failedLogin matches. */
export const FAILED_LOGIN_REGEX = "Failed password .* from <IP>";
