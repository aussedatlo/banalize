import { EventType } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BanEvent } from "src/bans/types/ban-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { NotifyEvent } from "../types/notify-event.types";

@Injectable()
export class NotifierEventHandlerService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent(Events.BAN_CREATION_DONE)
  async handleBanCreationDone(banEvent: BanEvent) {
    this.queueService.enqueue<BanEvent>(
      banEvent,
      this.notifyBan.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  async notifyBan(banEvent: BanEvent) {
    const notifyEvent = new NotifyEvent(
      EventType.BAN,
      "Banalize: Ban created",
      `[${banEvent.config.name}] New ban for IP ${banEvent.ip}`,
    );
    this.eventEmitter.emit(Events.NOTIFY, notifyEvent);
  }

  @OnEvent(Events.MATCH_CREATION_DONE)
  async handleMatchCreationDone(banEvent: BanEvent) {
    this.queueService.enqueue<BanEvent>(
      banEvent,
      this.notifyMatch.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  async notifyMatch(banEvent: BanEvent) {
    const notifyEvent = new NotifyEvent(
      EventType.MATCH,
      "Banalize: Match found",
      `[${banEvent.config.name}] New match for IP ${banEvent.ip}`,
    );
    this.eventEmitter.emit(Events.NOTIFY, notifyEvent);
  }
}
