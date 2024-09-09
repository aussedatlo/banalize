import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Config } from "src/configs/schemas/config.schema";
import { DockerWatcherService } from "./docker-watcher.service";
import { FileWatcherService } from "./file-watcher.service";
import { Watcher } from "./watcher.interface";

@Injectable()
export class WatcherFactory {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  createWatcher(config: Config): Watcher {
    switch (config.watcherType) {
      case "file":
        return new FileWatcherService(config, this.eventEmitter);
      case "docker":
        return new DockerWatcherService(config, this.eventEmitter);
      default:
        throw new NotFoundException("Unknown watcher type");
    }
  }
}
