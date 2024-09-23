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
import { WatcherStatusRecordModel } from "src/watchers/models/watcher-status-record.model";
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

  getStatus(): WatcherStatusRecordModel {
    return {
      data: this.watchers.reduce(
        (acc, watcher) => ({
          ...acc,
          [watcher.config._id]: {
            status: watcher.status,
            processedLines: watcher.processedLines,
            error:
              watcher.error && "message" in watcher.error
                ? watcher.error.message
                : null,
          },
        }),
        {},
      ),
    };
  }

  @OnEvent(Events.CONFIG_CREATED)
  handleConfigAdded(event: ConfigCreatedEvent) {
    this.logger.log(`Config added: ${event.config.param}`);
    const watcher = this.watcherFactory.createWatcher(event.config);
    watcher.start();
    this.watchers.push(watcher);
  }

  @OnEvent(Events.CONFIG_REMOVED)
  handleConfigRemoved(event: ConfigRemovedEvent) {
    this.logger.log(`Config removed: ${event.configId}`);
    this.watchers.forEach((watcher) => watcher.stop());
    this.startWatchers();
  }

  @OnEvent(Events.CONFIG_UPDATED)
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
}