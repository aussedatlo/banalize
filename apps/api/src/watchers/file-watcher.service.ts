import TailFile from "@logdna/tail-file";
import { Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Config } from "src/configs/schemas/config.schema";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { extractIp } from "./regex.utils";
import { Watcher } from "./watcher.interface";

const TAIL_RETRY_INTERVAL = 5 * 1000;
const TAIL_POLL_INTERVAL = 1000;

export class FileWatcherService implements Watcher {
  private readonly logger = new Logger(FileWatcherService.name);
  private tail: TailFile | null;
  private timeout: NodeJS.Timeout | null;

  constructor(
    private readonly config: Config,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.tail = null;
    this.timeout = null;
  }

  start(): void {
    try {
      this.tail = new TailFile(this.config.param, {
        encoding: "utf8",
        pollFileIntervalMs: TAIL_POLL_INTERVAL,
        pollFailureRetryMs: TAIL_RETRY_INTERVAL,
      });

      this.tail.on("data", (chunk) => {
        chunk
          .toString()
          .split("\n")
          .forEach((line: string) => {
            if (line.length) {
              const ip = extractIp(this.config.regex, line);
              if (ip) {
                this.logger.debug("Matched line");
                this.eventEmitter.emit(
                  Events.MATCH_CREATE,
                  new MatchEvent(line, ip, this.config),
                );
              }
            }
          });
      });

      this.tail.on("tail_error", (err) => {
        this.logger.error("Error tailing file");
        this.logger.error(err.message);
        this._retry();
      });

      this.tail.on("error", (err) => {
        this.logger.error("Error tailing file");
        this.logger.error(err.message);
        this._retry();
      });

      this.tail.start().catch((err) => {
        this.logger.error("Error tailing file");
        this.logger.error(err.message);
        this._retry();
      });
    } catch (error) {
      if (error instanceof Error) this.logger.error(error.message);
      this._retry();
    }
  }

  stop(): void {
    this.logger.debug("Stopping tail");
    clearTimeout(this.timeout);
    this.tail?.removeAllListeners();
    this.tail
      ?.quit()
      .then(() => {
        this.tail = null;
      })
      .catch((err) => {
        console.error(err.message);
      });
  }

  _retry() {
    this.logger.debug("Retrying tail");
    this.stop();
    this.timeout = setTimeout(() => {
      this.start();
    }, TAIL_RETRY_INTERVAL);
  }
}
