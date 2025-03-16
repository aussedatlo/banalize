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

  // Local in-memory cache
  private matchCache = new Map<string, number>();
  private bannedIps = new Set<string>();

  constructor(
    private matchesService: MatchesService,
    private eventEmitter: EventEmitter2,
    private queueService: QueueService,
  ) {}

  @OnEvent(Events.MATCH_CREATION_REQUESTED)
  handleMatchCreationRequested(event: MatchEvent) {
    this.queueService.enqueue<MatchEvent>(
      event,
      this.handleCacheAndImmediateCheck,
      QueuePriority.HIGH,
    );
  }

  // High-Priority Task: Cache Update & Immediate Ban Check
  // This task is used to handle a bulk of events that are coming in at the same time
  // It will update the cache and check if the IP should be banned immediately
  // - If the IP should be banned, it will emit a FIREWALL_DENY event
  // - If the IP should not be banned, it will enqueue the next task
  handleCacheAndImmediateCheck = async (event: MatchEvent) => {
    this.logger.debug(
      `Handling cache and immediate check for event ${event.ip}`,
    );
    const { ip, config } = event;
    const cacheKey = `${config._id}:${ip}`;

    const ignored = isIpInList(ip, config.ignoreIps);
    if (ignored) {
      this.logger.debug(`Match ignored, not checking for bans`);
      this.queueService.enqueue<MatchEvent>(
        event,
        this.createMatch,
        QueuePriority.MEDIUM,
      );
      return;
    }

    // Fetch or initialize match count in cache
    const entry = this.matchCache.get(cacheKey);
    if (!entry) {
      this.logger.debug(`Cache miss for ${cacheKey}, fetching from DB`);
      const { totalCount } = await this.matchesService.findAll({
        configId: config._id,
        ip,
        limit: 0,
      });
      this.matchCache.set(cacheKey, totalCount);
    }

    // Increment match count in cache
    const count = this.matchCache.get(cacheKey)! + 1;
    this.matchCache.set(cacheKey, count);
    this.logger.debug(`Matched ${count} times`);

    // Check if already banned in cache, if not, ban
    if (!this.bannedIps.has(ip) && count >= config.maxMatches) {
      this.logger.log(`Matched ${count} times, banning ${ip} (cache)`);
      this.bannedIps.add(ip);
      this.eventEmitter.emit(Events.FIREWALL_DENY, { ip });
    }

    this.queueService.enqueue<MatchEvent>(
      event,
      this.createMatch,
      QueuePriority.MEDIUM,
    );
  };

  // Medium-Priority Task: Create Match & Check for Ban
  createMatch = async (event: MatchEvent) => {
    // Clear cache & banned IPs
    const alreadyBannedByCache: boolean = this.bannedIps.has(event.ip);
    this.bannedIps.clear();
    this.matchCache.clear();

    const { line, ip, config } = event;
    this.logger.log(
      `Matched line: ${line}, ip: ${ip}, config: ${config.param}`,
    );

    const ignored = isIpInList(ip, config.ignoreIps);
    const timestamp = Date.now();

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

      if (!alreadyBannedByCache) {
        this.eventEmitter.emit(Events.FIREWALL_DENY, { ip });
      }

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
  const [byte1, byte2, byte3, byte4] = ip.split(".").map(Number);

  return ((byte1 << 24) + (byte2 << 16) + (byte3 << 8) + byte4) >>> 0;
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
