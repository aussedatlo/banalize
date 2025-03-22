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
  ) {
    this.logger.log("MatchEventHandlerService initialized");
  }

  @OnEvent(Events.MATCH_CREATION_REQUESTED)
  handleMatchCreationRequested(event: MatchEvent) {
    this.logger.log(
      `Match creation requested for IP ${event.ip} with config ${event.config.name}`,
    );
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
    const { ip, config } = event;
    const cacheKey = `${config._id}:${ip}`;
    let banned = false;

    this.logger.debug(
      `Processing event for IP ${ip} with config ${config.name} (ID: ${config._id})`,
    );

    const ignored = isIpInList(ip, config.ignoreIps);
    if (ignored) {
      this.logger.log(`IP ${ip} is in ignore list for config ${config.name}`);
      this.queueService.enqueue<MatchEvent>(
        { ...event, ignored: true, timestamp: Date.now(), banned },
        this.createMatch,
        QueuePriority.MEDIUM,
      );
      return;
    }

    // Fetch or initialize match count in cache
    const entry = this.matchCache.get(cacheKey);
    if (!entry) {
      this.logger.debug(
        `Cache miss for ${ip} (config: ${config.name}), fetching from database`,
      );
      const { totalCount } = await this.matchesService.findAll({
        configId: config._id,
        ip,
        limit: 0,
      });
      this.logger.debug(
        `Found ${totalCount} existing matches for ${ip} in database`,
      );
      this.matchCache.set(cacheKey, totalCount);
    }

    // Increment match count in cache
    const count = this.matchCache.get(cacheKey)! + 1;
    this.matchCache.set(cacheKey, count);
    this.logger.debug(
      `IP ${ip} has matched ${count}/${config.maxMatches} times for config ${config.name}`,
    );

    // Check if already banned in cache, if not, ban
    if (!this.bannedIps.has(ip) && count >= config.maxMatches) {
      banned = true;
      this.logger.warn(
        `IP ${ip} exceeded threshold (${count}/${config.maxMatches}) for config ${config.name} - initiating ban`,
      );
      this.eventEmitter.emit(Events.FIREWALL_DENY, { ip });
      this.bannedIps.add(ip);
    }

    this.queueService.enqueue<MatchEvent>(
      { ...event, timestamp: Date.now(), ignored: false, banned },
      this.createMatch,
      QueuePriority.MEDIUM,
    );
  };

  // Medium-Priority Task: Create Match & Check for Ban
  createMatch = async (event: MatchEvent) => {
    this.logger.debug("Clearing cache before match creation");
    this.bannedIps.clear();
    this.matchCache.clear();

    const { line, ip, config, ignored, timestamp, banned } = event;
    this.logger.log(
      `Creating match record - IP: ${ip}, Config: ${config.name}, Ignored: ${ignored}, Banned: ${banned}`,
    );

    try {
      await this.matchesService.create({
        line,
        regex: config.regex,
        ip,
        timestamp,
        configId: config._id,
      });
      this.logger.debug(`Successfully created match record for IP ${ip}`);
    } catch (error) {
      this.logger.error(
        `Failed to create match record for IP ${ip}: ${error.message}`,
      );
      throw error;
    }

    if (ignored) {
      this.logger.debug(`Match for IP ${ip} was ignored, skipping ban check`);
      this.eventEmitter.emit(Events.MATCH_CREATION_DONE, event);
      return;
    }

    if (banned) {
      this.logger.warn(`Requesting ban creation for IP ${ip}`);
      this.eventEmitter.emit(
        Events.BAN_CREATION_REQUESTED,
        new BanEvent(ip, config),
      );
    }

    this.logger.debug(`Match creation process completed for IP ${ip}`);
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
