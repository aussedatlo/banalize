import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { format, getISOWeek } from "date-fns";
import { BansService } from "src/bans/bans.service";
import { Ban } from "src/bans/schemas/ban.schema";
import { ConfigsService } from "src/configs/configs.service";
import { BanEvent } from "src/events/ban-event.types";
import { Events } from "src/events/events.enum";
import { MatchEvent } from "src/events/match-event.types";
import { MatchesService } from "src/matches/matches.service";
import { Match } from "src/matches/schemas/match";
import { FiltersStatsHistoryDto } from "src/stats/dto/filters-stats-history.dto";
import { StatsHistoryModel } from "src/stats/models/stats-history.model";

const SAMPLE_SIZE = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;

@Injectable()
export class StatsHistoryService implements OnModuleInit {
  private readonly logger = new Logger(StatsHistoryService.name);
  private record: Record<string, StatsHistoryModel> = {};

  constructor(
    private readonly matchesService: MatchesService,
    private readonly bansService: BansService,
    private readonly configsService: ConfigsService,
  ) {}

  async getStats(filters: FiltersStatsHistoryDto): Promise<StatsHistoryModel> {
    const { period, configId } = filters;
    const key = `stats:${period}:${configId ? `${configId}` : "global"}`;
    this.logger.log(`Getting stats for key ${key}`);
    const stats = this.record[key];
    return stats;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Computing stats on module init");
    await this.computeStats();

    const configs = await this.configsService.findAll();
    for (const config of configs) {
      await this.computeStats(config._id);
    }
  }

  @OnEvent(Events.MATCH_CREATE)
  @OnEvent(Events.BAN_CREATE)
  async handleEvent(event: BanEvent | MatchEvent): Promise<void> {
    this.computeStats(event.config._id);
    this.computeStats();
  }

  async computeStats(configId?: string): Promise<void> {
    const id = configId ?? "global";
    const bans = await this.bansService.findAll(configId ? { configId } : {});
    const matches = await this.matchesService.findAll(
      configId ? { configId } : {},
    );

    this.computeDailyStats(matches, bans, id);
    this.computeWeeklyStats(matches, bans, id);
    this.computeMonthlyStats(matches, bans, id);
  }

  async computeDailyStats(
    matches: Match[],
    bans: Ban[],
    configId?: string,
  ): Promise<void> {
    const stats: StatsHistoryModel = {
      bans: { data: {} },
      matches: { data: {} },
    };
    const timestamp = new Date().getTime();
    const timestampDaysAgo = timestamp - DAY_IN_MS * SAMPLE_SIZE;

    const bansAfterOneWeekAgo = bans.filter(
      (ban) => ban.timestamp >= timestampDaysAgo,
    );
    const matchesAfterOneWeekAgo = matches.filter(
      (match) => match.timestamp >= timestampDaysAgo,
    );

    const initialData = {};
    for (let i = 0; i <= SAMPLE_SIZE; i++) {
      const day = format(
        new Date(timestampDaysAgo + i * DAY_IN_MS),
        "dd-MM-yyyy",
      );
      initialData[day] = 0;
    }

    stats.bans.data = bansAfterOneWeekAgo.reduce(
      (acc, ban) => {
        const day = format(new Date(ban.timestamp), "dd-MM-yyyy");
        acc[day] = acc[day] + 1;
        return acc;
      },
      { ...initialData },
    );

    stats.matches.data = matchesAfterOneWeekAgo.reduce(
      (acc, match) => {
        const day = format(new Date(match.timestamp), "dd-MM-yyyy");
        acc[day] = acc[day] + 1;
        return acc;
      },
      { ...initialData },
    );

    const key = `stats:daily${configId ? `:${configId}` : ""}`;
    this.record[key] = stats;
  }

  async computeWeeklyStats(
    matches: Match[],
    bans: Ban[],
    configId?: string,
  ): Promise<void> {
    const stats: StatsHistoryModel = {
      bans: { data: {} },
      matches: { data: {} },
    };
    const timestamp = new Date().getTime();
    const timestampWeeksAgo = timestamp - WEEK_IN_MS * SAMPLE_SIZE;

    const bansAfterOneWeekAgo = bans.filter(
      (ban) => ban.timestamp >= timestampWeeksAgo,
    );
    const matchesAfterOneWeekAgo = matches.filter(
      (match) => match.timestamp >= timestampWeeksAgo,
    );

    const initialData = {};
    for (let i = 0; i <= SAMPLE_SIZE; i++) {
      const week = getISOWeek(new Date(timestampWeeksAgo + i * WEEK_IN_MS));
      initialData[week] = 0;
    }

    stats.bans.data = bansAfterOneWeekAgo.reduce(
      (acc, ban) => {
        const week = getISOWeek(new Date(ban.timestamp));
        acc[week] = acc[week] + 1;
        return acc;
      },
      { ...initialData },
    );

    stats.matches.data = matchesAfterOneWeekAgo.reduce(
      (acc, match) => {
        const week = getISOWeek(new Date(match.timestamp));
        acc[week] = acc[week] + 1;
        return acc;
      },
      { ...initialData },
    );

    const key = `stats:weekly${configId ? `:${configId}` : ""}`;
    this.record[key] = stats;
  }

  async computeMonthlyStats(
    matches: Match[],
    bans: Ban[],
    configId?: string,
  ): Promise<void> {
    const stats: StatsHistoryModel = {
      bans: { data: {} },
      matches: { data: {} },
    };
    const timestamp = new Date().getTime();
    const currentMonthNumber = new Date(timestamp).getMonth();
    const timestampMonthsAgo = new Date(timestamp).setMonth(
      currentMonthNumber - SAMPLE_SIZE,
    );

    const bansAfterMonthAgo = bans.filter(
      (ban) => ban.timestamp >= timestampMonthsAgo,
    );
    const matchesAfterMonthAgo = matches.filter(
      (match) => match.timestamp >= timestampMonthsAgo,
    );

    const initialData = {};
    for (let i = 0; i <= SAMPLE_SIZE; i++) {
      const date = new Date(timestamp);
      const previousDate = new Date(date).setMonth(date.getMonth() - i);
      initialData[format(previousDate, "MM-yyyy")] = 0;
    }

    stats.bans.data = bansAfterMonthAgo.reduce(
      (acc, ban) => {
        const month = format(new Date(ban.timestamp), "MM-yyyy");
        acc[month] = acc[month] + 1;
        return acc;
      },
      { ...initialData },
    );

    stats.matches.data = matchesAfterMonthAgo.reduce(
      (acc, match) => {
        const month = format(new Date(match.timestamp), "MM-yyyy");
        acc[month] = acc[month] + 1;
        return acc;
      },
      { ...initialData },
    );

    const key = `stats:monthly${configId ? `:${configId}` : ""}`;
    this.record[key] = stats;
  }
}
