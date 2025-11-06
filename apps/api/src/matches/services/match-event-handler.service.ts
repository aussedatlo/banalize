import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { BanEvent } from "src/bans/types/ban-event.types";
import { ConfigsService } from "src/configs/configs.service";
import { MatchEvent } from "src/matches/types/match-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { MatchesService } from "./matches.service";

type MatchCache = {
  timestamp: number;
};

@Injectable()
export class MatchEventHandlerService implements OnModuleInit {
  private readonly logger = new Logger(MatchEventHandlerService.name);

  // Local in-memory cache
  private matchesCache: Record<string, Record<string, MatchCache[]>> = {};

  constructor(
    private matchesService: MatchesService,
    private configsService: ConfigsService,
    private eventEmitter: EventEmitter2,
    private queueService: QueueService,
  ) {
    this.logger.log("MatchEventHandlerService initialized");
  }

  async onModuleInit() {
    // Initialize the cache
    const configs = await this.configsService.findAll();
    for (const config of configs) {
      const { matches } = await this.matchesService.findAll({
        configId: config._id,
        timestamp_gt: Date.now() - config.findTime * 1000,
        limit: config.maxMatches,
      });

      this.matchesCache[config._id] = {};
      for (const match of matches) {
        if (!this.matchesCache[config._id][match.ip]) {
          this.matchesCache[config._id][match.ip] = [];
        }
        this.matchesCache[config._id][match.ip].push({
          timestamp: match.timestamp,
        });
      }

      this.logger.log(
        `Initialized cache for config ${config.name} with ${matches.length} matches`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.queueService.enqueue(undefined, this.cleanupCache, QueuePriority.LOW);
  }

  cleanupCache = async () => {
    const configs = await this.configsService.findAll();
    for (const config of configs) {
      const ipMatches = this.matchesCache[config._id] ?? {};

      for (const ip in ipMatches) {
        const matches = ipMatches[ip];
        const newMatches = matches.filter(
          (match) => Date.now() - match.timestamp < config.findTime * 1000,
        );

        if (newMatches.length > 0) {
          this.matchesCache[config._id][ip] = newMatches;
        } else {
          delete this.matchesCache[config._id][ip];
        }
      }
    }
  };

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
    let banned = false;
    const timestamp = Date.now();

    this.logger.debug(
      `Processing event for IP ${ip} with config ${config.name} (ID: ${config._id})`,
    );

    if (!this.matchesCache[config._id]) {
      this.matchesCache[config._id] = {};
    }

    if (!this.matchesCache[config._id][ip]) {
      this.matchesCache[config._id][ip] = [];
    }

    const newMatch = { timestamp };
    this.matchesCache[config._id][ip] = [
      newMatch,
      ...this.matchesCache[config._id][ip],
    ];

    if (this.matchesCache[config._id][ip].length >= config.maxMatches) {
      banned = true;
      this.logger.warn(
        `IP ${ip} has exceeded the max matches for config ${config.name}`,
      );
      this.eventEmitter.emit(Events.FIREWALL_DENY, { ip });
    }

    this.queueService.enqueue<MatchEvent>(
      { ...event, timestamp, banned },
      this.createMatch,
      QueuePriority.MEDIUM,
    );
  };

  // Medium-Priority Task: Create Match & Check for Ban
  createMatch = async (event: MatchEvent) => {
    const { line, ip, config, timestamp, banned } = event;
    const ignored = isIpInList(ip, config.ignoreIps);
    this.logger.log(
      `Creating match record - IP: ${ip}, Config: ${config.name}, Ignored: ${ignored}, Banned: ${banned}`,
    );

    await this.matchesService.create({
      line,
      regex: config.regex,
      ip,
      timestamp,
      configId: config._id,
    });
    this.logger.debug(`Successfully created match record for IP ${ip}`);

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
