import {
  WatcherStatusData,
  type WatcherStatusesResponse,
} from "@banalize/types";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { ConfigsService } from "src/configs/configs.service";
import {
  ConfigCreatedEvent,
  ConfigRemovedEvent,
  ConfigUpdatedEvent,
} from "src/events/config-event.types";
import { Events } from "src/events/events.enum";
import { Watcher } from "src/watchers/interfaces/watcher.interface";
import { WatcherFactory } from "src/watchers/watcher.factory";

@Injectable()
export class WatcherManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WatcherManagerService.name);
  private watchers: Watcher[] = [];

  constructor(
    private readonly configsService: ConfigsService,
    private readonly watcherFactory: WatcherFactory,
  ) {}

  async onModuleInit() {
    this.startWatchers();
  }

  onModuleDestroy() {
    this.watchers.forEach((watcher) => watcher.stop());
  }

  getStatuses(): WatcherStatusesResponse {
    return {
      data: this.watchers.reduce(
        (acc: Record<string, WatcherStatusData>, watcher: Watcher) => ({
          ...acc,
          [watcher.config._id]: this.getWatcherStatusData(watcher),
        }),
        {},
      ),
    };
  }

  getStatus(configId: string): WatcherStatusesResponse {
    const watcher = this.watchers.find(
      (w) => w.config._id.toString() === configId,
    );

    if (!watcher) {
      return {
        data: {},
      };
    }

    return {
      data: {
        [configId]: this.getWatcherStatusData(watcher),
      },
    };
  }

  @OnEvent(Events.CONFIG_CREATION_DONE)
  handleConfigAdded(event: ConfigCreatedEvent) {
    this.logger.log(`Config added: ${event.config.param}`);
    const watcher = this.watcherFactory.createWatcher(event.config);
    watcher.start();
    this.watchers.push(watcher);
  }

  @OnEvent(Events.CONFIG_REMOVE_DONE)
  handleConfigRemoved(event: ConfigRemovedEvent) {
    this.logger.log(`Config removed: ${event.configId}`);
    this.watchers.forEach((watcher) => watcher.stop());
    this.startWatchers();
  }

  @OnEvent(Events.CONFIG_UPDATE_DONE)
  handleConfigUpdated(event: ConfigUpdatedEvent) {
    this.logger.log(`Config updated: ${event.config.param}`);
    this.watchers.forEach((watcher) => watcher.stop());
    this.startWatchers();
  }

  private async startWatchers() {
    const configs = await this.configsService.findAll();
    this.logger.log(`Found ${configs.length} configs`);
    configs.forEach((config) => {
      this.logger.log(`Starting watcher for ${config.param}`);
      const watcher = this.watcherFactory.createWatcher(config);
      watcher.start();
      this.watchers.push(watcher);
    });
  }

  private getWatcherStatusData(watcher: Watcher): WatcherStatusData {
    return {
      status: watcher.status,
      processedLines: watcher.processedLines,
      error:
        watcher.error && "message" in watcher.error
          ? watcher.error.message
          : null,
    };
  }
}
