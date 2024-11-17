import { EventType } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BanEvent } from "src/bans/types/ban-event.types";
import { Events } from "src/shared/enums/events.enum";
import { NotifyEvent } from "../types/notify-event.types";

@Injectable()
export class NotifierEventHandlerService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent(Events.BAN_CREATION_DONE)
  handleBanCreationDone(banEvent: BanEvent) {
    const notifyEvent = new NotifyEvent(
      EventType.BAN,
      "Banalize: Ban created",
      `[${banEvent.config.name}] New ban for IP ${banEvent.ip}`,
    );
    this.eventEmitter.emit(Events.NOTIFY, notifyEvent);
  }

  @OnEvent(Events.MATCH_CREATION_DONE)
  handleMatchCreationDone(banEvent: BanEvent) {
    const notifyEvent = new NotifyEvent(
      EventType.MATCH,
      "Banalize: Match found",
      `[${banEvent.config.name}] New match for IP ${banEvent.ip}`,
    );
    this.eventEmitter.emit(Events.NOTIFY, notifyEvent);
  }
}
