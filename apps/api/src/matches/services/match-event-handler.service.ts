import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { BanEvent } from "src/bans/types/ban-event.types";
import { MatchEvent } from "src/matches/types/match-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { MatchesService } from "./matches.service";

@Injectable()
export class MatchEventHandlerService {
  private readonly logger = new Logger(MatchEventHandlerService.name);

  constructor(
    private matchesService: MatchesService,
    private eventEmitter: EventEmitter2,
    private queueService: QueueService,
  ) {}

  @OnEvent(Events.MATCH_CREATION_REQUESTED)
  handleMatchCreationRequested(event: MatchEvent) {
    this.queueService.enqueue<MatchEvent>(
      event,
      this.createMatch,
      QueuePriority.MEDIUM,
    );
  }

  createMatch = async (event: MatchEvent) => {
    const { line, ip, config } = event;
    this.logger.log(
      `Matched line: ${line}, ip: ${ip}, config: ${config.param}`,
    );

    const ignored = isIpInList(ip, config.ignoreIps);
    const timestamp = new Date().getTime();

    await this.matchesService.create({
      line,
      regex: config.regex,
      ip,
      timestamp,
      configId: config._id,
    });

    if (ignored) {
      this.logger.debug(`Match ignored, not checking for bans`);
      this.eventEmitter.emit(Events.MATCH_CREATION_DONE, event);
      return;
    }

    const { totalCount } = await this.matchesService.findAll({
      configId: config._id,
      ip,
      timestamp_gt: timestamp - config.findTime * 1000,
      limit: 0,
    });

    this.logger.debug(`Matched ${totalCount} times`);

    if (totalCount >= config.maxMatches) {
      this.logger.log(`Matched ${totalCount} times, banning ${ip}`);
      this.eventEmitter.emit(
        Events.BAN_CREATION_REQUESTED,
        new BanEvent(ip, config),
      );
    }

    this.eventEmitter.emit(Events.MATCH_CREATION_DONE, event);
  };
}

// example
// IP "192.168.1.1"
// 192 << 24 = 192 * 2²⁴
// 168 << 16 = 168 * 2¹⁶
// 1 << 8    = 1 * 2⁸
// 1         = 1 * 2⁰

export function ipToLong(ip: string): number {
  const [octet1, octet2, octet3, octet4] = ip.split(".").map(Number);

  return ((octet1 << 24) + (octet2 << 16) + (octet3 << 8) + octet4) >>> 0;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, bits = "32"] = cidr.split("/");
  const mask = ~((1 << (32 - parseInt(bits))) - 1);

  const ipLong = ipToLong(ip);
  const networkLong = ipToLong(network);

  return (ipLong & mask) === (networkLong & mask);
}

export function isIpInList(ip: string, ignoreList: string[]): boolean {
  return ignoreList.some((ignore) => {
    if (ignore.includes("/")) {
      return isIpInCidr(ip, ignore);
    }
    return ip === ignore;
  });
}
