import { extractIp } from "@banalize/shared-utils";
import { WatcherStatus } from "@banalize/types";
import TailFile from "@logdna/tail-file";
import { Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigSchema } from "src/configs/schemas/config.schema";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { Watcher } from "src/watchers/interfaces/watcher.interface";

const TAIL_RETRY_INTERVAL = 5 * 1000;
const TAIL_POLL_INTERVAL = 1000;

export class FileWatcherService implements Watcher {
  private readonly logger = new Logger(FileWatcherService.name);
  private tail: TailFile | null;
  private timeout: NodeJS.Timeout | null;
  processedLines: number;
  status: WatcherStatus;
  error: Error | null;

  constructor(
    readonly config: ConfigSchema,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.tail = null;
    this.timeout = null;
    this.processedLines = 0;
    this.status = WatcherStatus.INIT;
    this.error = null;
  }

  start = (): void => {
    if (this.config.paused) {
      this.logger.debug("Config is paused, not starting tail");
      this.status = WatcherStatus.PAUSED;
      return;
    }

    try {
      this.tail = new TailFile(this.config.param, {
        encoding: "utf8",
        pollFileIntervalMs: TAIL_POLL_INTERVAL,
        pollFailureRetryMs: TAIL_RETRY_INTERVAL,
      });

      this.tail.on("data", this.onData);
      this.tail.on("tail_error", this.onError);
      this.tail.on("error", this.onError);

      this.tail
        .start()
        .then(() => {
          this.status = WatcherStatus.RUNNING;
          this.error = null;
        })
        .catch(this.onError);
    } catch (error) {
      this.onError(error);
    }
  };

  stop = (): void => {
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
    this.status = WatcherStatus.STOPPED;
  };

  private onData = (chunk: Buffer) => {
    const lines = chunk.toString().split("\n");

    for (const line of lines) {
      if (line.length) {
        this.processedLines++;
        const ip = extractIp(this.config.regex, line)[2];
        if (ip && !this.config.ignoreIps.includes(ip)) {
          this.logger.debug("Matched line");

          this.eventEmitter.emit(
            Events.MATCH_CREATION_REQUESTED,
            new MatchEvent(line, ip, this.config),
          );
        }
      }
    }
  };

  private onError = (err: Error) => {
    this.logger.error("Error tailing file");
    this.logger.error(err.message);
    this.retry();
    this.status = WatcherStatus.ERROR;
    this.error = err;
  };

  private retry = () => {
    this.logger.debug("Retrying tail");
    this.stop();
    this.timeout = setTimeout(() => {
      this.start();
    }, TAIL_RETRY_INTERVAL);
  };
}
