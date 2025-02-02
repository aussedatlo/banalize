import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Events } from "src/shared/enums/events.enum";
import { UnbanEvent } from "src/unbans/types/unban-event.types";
import { UnbansService } from "./unbans.service";

@Injectable()
export class UnbansEventHandlerService {
  constructor(
    private unbansService: UnbansService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(Events.UNBAN_CREATE_REQUESTED)
  async handleBan(event: UnbanEvent) {
    const { ip, configId, banId } = event;

    await this.unbansService.create({
      ip,
      timestamp: new Date().getTime(),
      banId,
      configId,
    });

    this.eventEmitter.emit(Events.FIREWALL_ALLOW, { ip });
  }
}
