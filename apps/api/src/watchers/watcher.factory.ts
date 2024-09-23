import { Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { ConfigSchema } from "src/configs/schemas/config.schema";
import { Watcher } from "./interfaces/watcher.interface";
import { DockerWatcherService } from "./services/docker-watcher.service";
import { FileWatcherService } from "./services/file-watcher.service";

@Injectable()
export class WatcherFactory {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  createWatcher(config: ConfigSchema): Watcher {
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
