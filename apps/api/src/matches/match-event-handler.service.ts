import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BanEvent } from "src/events/ban-event.types";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { MatchesService } from "./matches.service";

@Injectable()
export class MatchEventHandlerService {
  private readonly logger = new Logger(MatchEventHandlerService.name);

  constructor(
    private matchesService: MatchesService,
    private eventEmitter: EventEmitter2,
  ) {}

  @OnEvent(Events.MATCH_CREATE)
  async handleMatch(event: MatchEvent) {
    const { line, ip, config } = event;
    this.logger.log(
      `Matched line: ${line}, ip: ${ip}, config: ${config.param}`,
    );

    const timestamp = new Date().getTime();

    await this.matchesService.create({
      line,
      regex: config.regex,
      ip,
      timestamp,
      configId: config._id,
    });

    const matches = await this.matchesService.findAll({
      configId: config._id,
      timestamp_gt: timestamp - config.findTime * 1000,
    });

    this.logger.debug(`Matched ${matches.length} times`);

    if (matches.length >= config.maxMatches) {
      this.logger.log(`Matched ${matches.length} times, banning ${ip}`);
      this.eventEmitter.emit(Events.BAN_CREATE, new BanEvent(ip, config));
    }
  }
}
