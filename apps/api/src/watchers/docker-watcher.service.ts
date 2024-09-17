import { Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import Docker from "dockerode";
import { Config } from "src/configs/schemas/config.schema";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { extractIp } from "./regex.utils";
import { Watcher } from "./watcher.interface";

const DOCKER_RETRY_INTERVAL = 5 * 1000;

export class DockerWatcherService implements Watcher {
  private readonly logger = new Logger(DockerWatcherService.name);
  private docker: Docker;
  private stream: NodeJS.ReadableStream | null;
  private timeout: NodeJS.Timeout | null;

  constructor(
    private readonly config: Config,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log(`Creating watcher for container ${this.config.param}`);
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    this.stream = null;
    this.timeout = null;
  }

  start(): void {
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

        stream.on("data", (chunk) => {
          chunk
            .toString()
            .split("\n")
            .forEach((line: string) => {
              if (line.length) {
                this.logger.debug(`Received line: ${line}`);
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

        stream.on("error", (err) => {
          this.logger.error("Error tailing container logs");
          this.logger.error(err.message);
          this._retry();
        });

        stream.on("end", () => {
          this.logger.error("Stream ended unexpectedly");
          this._retry();
        });
      })
      .catch((err) => {
        this.logger.error("Error tailing container logs");
        this.logger.error(err.message);
        this._retry();
      });
  }

  stop(): void {
    clearTimeout(this.timeout);
    this.stream?.removeAllListeners();
    this.stream = null;
  }

  _retry() {
    this.timeout = setTimeout(() => {
      this.start();
    }, DOCKER_RETRY_INTERVAL);
  }
}
