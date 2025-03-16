import { EventType } from "@banalize/types";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Notification } from "src/notifications/interfaces/notification.interface";
import { Notifier } from "src/notifications/interfaces/notifier.interface";
import { NotifierFactory } from "src/notifications/notifier-factory";
import { NotifyEvent } from "src/notifications/types/notify-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { NotifierConfigService } from "./notifier-config-service.service";

@Injectable()
export class NotifierManager implements OnModuleInit {
  private readonly logger: Logger = new Logger(NotifierManager.name);
  private notifiers: Record<EventType, Notifier[]> = null;

  constructor(
    private readonly notifierConfigService: NotifierConfigService,
    private readonly notifierFactory: NotifierFactory,
    private queueService: QueueService,
  ) {}

  async onModuleInit() {
    this.logger.log("NotifierManager initialized");
    this.loadNotifiers();
  }

  @OnEvent(Events.NOTIFY)
  async handleNotify(event: NotifyEvent) {
    this.queueService.enqueue<NotifyEvent>(
      event,
      this.notify.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  async notify({ type, title, message }: NotifyEvent) {
    this.logger.debug(`Notifying ${type} with message: ${message}`);
    for (const notifier of this.notifiers[type]) {
      notifier.notify(new Notification(title, message));
    }
  }

  @OnEvent(Events.NOTIFY_CONFIG_CREATION_DONE)
  @OnEvent(Events.NOTIFY_CONFIG_UPDATE_DONE)
  @OnEvent(Events.NOTIFY_CONFIG_DELETE_DONE)
  async handleReloadNotifiers() {
    this.queueService.enqueue<void>(
      undefined,
      this.loadNotifiers.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  private async loadNotifiers() {
    this.logger.debug("Reloading notifiers");
    this.notifiers = {
      [EventType.BAN]: [],
      [EventType.UNBAN]: [],
      [EventType.MATCH]: [],
    };
    const configs = await this.notifierConfigService.findAll();
    for (const config of configs) {
      const notifier = this.notifierFactory.createNotifier(config);
      for (const type of config.events) {
        this.notifiers[type].push(notifier);
      }
    }
  }
}
