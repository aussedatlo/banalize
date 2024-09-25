import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { format, getISOWeek } from "date-fns";
import { BansService } from "src/bans/bans.service";
import { BanSchema } from "src/bans/schemas/ban.schema";
import { ConfigsService } from "src/configs/configs.service";
import { BanEvent } from "src/events/ban-event.types";
import { MatchEvent } from "src/events/match-event.types";
import { MatchSchema } from "src/matches/schemas/match.schema";
import { MatchesService } from "src/matches/services/matches.service";
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

  addOneEvent(event: BanEvent | MatchEvent): void {
    const config = event.config;
    const date = new Date();
    const dailyKey = this.getKey(config._id, "daily");
    const weeklyKey = this.getKey(config._id, "weekly");
    const monthlyKey = this.getKey(config._id, "monthly");

    const dailyDate = this.getFormattedDate(date, "daily");
    const weeklyDate = this.getFormattedDate(date, "weekly");
    const monthlyDate = this.getFormattedDate(date, "monthly");

    if (event instanceof BanEvent) {
      this.record[dailyKey].bans.data[dailyDate] += 1;
      this.record[weeklyKey].bans.data[weeklyDate] += 1;
      this.record[monthlyKey].bans.data[monthlyDate] += 1;
    } else {
      this.record[dailyKey].matches.data[dailyDate] += 1;
      this.record[weeklyKey].matches.data[weeklyDate] += 1;
      this.record[monthlyKey].matches.data[monthlyDate] += 1;
    }
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
    matches: MatchSchema[],
    bans: BanSchema[],
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
      const day = this.getFormattedDate(
        timestampDaysAgo + i * DAY_IN_MS,
        "daily",
      );
      initialData[day] = 0;
    }

    stats.bans.data = bansAfterOneWeekAgo.reduce(
      (acc, ban) => {
        const day = this.getFormattedDate(ban.timestamp, "daily");
        acc[day] = acc[day] + 1;
        return acc;
      },
      { ...initialData },
    );

    stats.matches.data = matchesAfterOneWeekAgo.reduce(
      (acc, match) => {
        const day = this.getFormattedDate(match.timestamp, "daily");
        acc[day] = acc[day] + 1;
        return acc;
      },
      { ...initialData },
    );

    const key = this.getKey(configId, "daily");
    this.record[key] = stats;
  }

  async computeWeeklyStats(
    matches: MatchSchema[],
    bans: BanSchema[],
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
      const week = this.getFormattedDate(
        timestampWeeksAgo + i * WEEK_IN_MS,
        "weekly",
      );
      initialData[week] = 0;
    }

    stats.bans.data = bansAfterOneWeekAgo.reduce(
      (acc, ban) => {
        const week = this.getFormattedDate(ban.timestamp, "weekly");
        acc[week] = acc[week] + 1;
        return acc;
      },
      { ...initialData },
    );

    stats.matches.data = matchesAfterOneWeekAgo.reduce(
      (acc, match) => {
        const week = this.getFormattedDate(match.timestamp, "weekly");
        acc[week] = acc[week] + 1;
        return acc;
      },
      { ...initialData },
    );

    const key = this.getKey(configId, "weekly");
    this.record[key] = stats;
  }

  async computeMonthlyStats(
    matches: MatchSchema[],
    bans: BanSchema[],
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
      const previousDate = this.getFormattedDate(
        new Date(date).setMonth(date.getMonth() - i),
        "monthly",
      );
      initialData[previousDate] = 0;
    }

    stats.bans.data = bansAfterMonthAgo.reduce(
      (acc, ban) => {
        const month = this.getFormattedDate(ban.timestamp, "monthly");
        acc[month] = acc[month] + 1;
        return acc;
      },
      { ...initialData },
    );

    stats.matches.data = matchesAfterMonthAgo.reduce(
      (acc, match) => {
        const month = this.getFormattedDate(match.timestamp, "monthly");
        acc[month] = acc[month] + 1;
        return acc;
      },
      { ...initialData },
    );

    const key = this.getKey(configId, "monthly");
    this.record[key] = stats;
  }

  private getFormattedDate(date: Date | number, formatType: string): string {
    if (typeof date === "number") {
      date = new Date(date);
    }

    switch (formatType) {
      case "daily":
        return format(date, "dd-MM-yyyy");
      case "weekly":
        return getISOWeek(date).toString();
      case "monthly":
        return format(date, "MM-yyyy");
      default:
        throw new Error("Invalid format type");
    }
  }

  private getKey(configId: string, period: string): string {
    return `stats:${period}:${configId}`;
  }
}
