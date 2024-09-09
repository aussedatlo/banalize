import { EventEmitter2 } from "@nestjs/event-emitter";
import Docker from "dockerode";
import { Config } from "src/configs/schemas/config.schema";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { extractIp } from "./regex.utils";
import { Watcher } from "./watcher.interface";

export class DockerWatcherService implements Watcher {
  private docker: Docker;
  private stream: NodeJS.ReadableStream | null;
  private timeout: NodeJS.Timeout | null;

  constructor(
    private readonly config: Config,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.docker = new Docker({ socketPath: "/var/run/docker.sock" });
    this.stream = null;
    this.timeout = null;
  }

  start(): void {
    const container = this.docker.getContainer(this.config.param);

    container
      .logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 0,
      })
      .then((stream) => {
        console.log("Stream started");
        this.stream = stream;

        stream.on("data", (chunk) => {
          chunk
            .toString()
            .split("\n")
            .forEach((line: string) => {
              if (line.length) {
                const ip = extractIp(this.config.regex, line);
                if (ip) {
                  console.debug("Matched line");
                  this.eventEmitter.emit(
                    Events.MATCH_CREATE,
                    new MatchEvent(line, ip, this.config),
                  );
                }
              }
            });
        });

        stream.on("error", (err) => {
          console.error(err);
        });

        stream.on("end", () => {
          this._retry();
        });
      })
      .catch((err) => {
        console.error(err.reason);
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
    }, 1000);
  }
}
