import { extractIp } from "@banalize/shared-utils";
import { Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Docker from "dockerode";
import { ConfigSchema } from "src/configs/schemas/config.schema";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { Status } from "src/watchers/enums/status.enum";
import { Watcher } from "src/watchers/interfaces/watcher.interface";

const DOCKER_RETRY_INTERVAL = 5 * 1000;

export class DockerWatcherService implements Watcher {
  private readonly logger = new Logger(DockerWatcherService.name);
  private docker: Docker;
  private stream: NodeJS.ReadableStream | null;
  private timeout: NodeJS.Timeout | null;
  processedLines: number;
  status: Status;
  error: Error | null;

  constructor(
    readonly config: ConfigSchema,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log(`Creating watcher for container ${this.config.param}`);
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    this.stream = null;
    this.timeout = null;
    this.status = Status.INIT;
    this.error = null;
  }

  start = (): void => {
    this.logger.log(`Starting watcher for container ${this.config.param}`);
    const container = this.docker.getContainer(this.config.param);

    container
      .logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 0,
      })
      .then((stream) => {
        this.stream = stream;
        this.status = Status.RUNNING;
        this.error = null;

        stream.on("data", this.onData);
        stream.on("error", this.onError);
        stream.on("end", this.onError);
      })
      .catch(this.onError);
  };

  stop = (): void => {
    clearTimeout(this.timeout);
    this.stream?.removeAllListeners();
    this.stream = null;
    this.status = Status.STOPPED;
  };

  private onData = async (chunk: Buffer) => {
    const lines = chunk.toString().split("\n");

    for (const line of lines) {
      if (line.length) {
        this.processedLines++;
        const ip = extractIp(this.config.regex, line);
        if (ip && !this.config.ignoreIps.includes(ip)) {
          this.logger.debug("Matched line");

          await this.eventEmitter.emitAsync(
            Events.MATCH_CREATION_REQUESTED,
            new MatchEvent(line, ip, this.config),
          );
        }
      }
    }
  };

  private onError = (err: Error) => {
    this.logger.error("Error tailing container logs");
    this.logger.error(err.message);
    this.retry();
    this.status = Status.ERROR;
    this.error = err;
  };

  private retry = () => {
    this.timeout = setTimeout(() => {
      this.start();
    }, DOCKER_RETRY_INTERVAL);
  };
}
