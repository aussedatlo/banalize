import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Events } from "src/events/events.enum";
import { UnbanEvent } from "src/events/unban-event.types";
import { UnbansService } from "./unbans.service";

@Injectable()
export class UnbansEventHandlerService {
  constructor(private unbansService: UnbansService) {}

  @OnEvent(Events.UNBAN_CREATE_REQUESTED)
  async handleBan(event: UnbanEvent) {
    const { ip, configId, banId } = event;

    await this.unbansService.create({
      ip,
      timestamp: new Date().getTime(),
      banId,
      configId,
    });
  }
}
