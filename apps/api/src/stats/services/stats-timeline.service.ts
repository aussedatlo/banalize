import { StatsTimelineResponse } from "@banalize/types";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { format, getISOWeek } from "date-fns";
import { BanSchema } from "src/bans/schemas/ban.schema";
import { BansService } from "src/bans/services/bans.service";
import { BanEvent } from "src/bans/types/ban-event.types";
import { ConfigsService } from "src/configs/configs.service";
import { MatchSchema } from "src/matches/schemas/match.schema";
import { MatchesService } from "src/matches/services/matches.service";
import { MatchEvent } from "src/matches/types/match-event.types";
import { Events } from "src/shared/enums/events.enum";
import { QueuePriority } from "src/shared/enums/priority.enum";
import { QueueService } from "src/shared/services/queue.service";
import { StatsTimelineFiltersDto } from "src/stats/dtos/stats-timeline-filters.dto";

const SAMPLE_SIZE = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const WEEK_IN_MS = 7 * DAY_IN_MS;

@Injectable()
export class StatsTimelineService implements OnModuleInit {
  private readonly logger = new Logger(StatsTimelineService.name);
  private record: Record<string, StatsTimelineResponse> = {};
  private isQueueProcessing = false;

  constructor(
    private readonly matchesService: MatchesService,
    private readonly bansService: BansService,
    private readonly configsService: ConfigsService,
    private readonly queueService: QueueService,
  ) {}

  async getStats(
    filters: StatsTimelineFiltersDto,
  ): Promise<StatsTimelineResponse> {
    const { period, configId } = filters;
    const key = `stats:${period}:${configId ? `${configId}` : "global"}`;
    this.logger.log(`Getting stats for key ${key}`);
    const stats = this.record[key];
    return stats;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Computing stats on module init");
    this.computeAllStats();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron(): Promise<void> {
    this.logger.debug("Computing stats on cron job");
    this.queueService.enqueue<void>(
      undefined,
      this.computeAllStats.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  @OnEvent(Events.BAN_CREATION_DONE)
  @OnEvent(Events.MATCH_CREATION_DONE)
  async handleBanOrMatchCreationDone(
    event: BanEvent | MatchEvent,
  ): Promise<void> {
    if (this.isQueueProcessing) return;

    this.isQueueProcessing = true;
    this.queueService.enqueue<BanEvent | MatchEvent>(
      event,
      this.addOneEvent.bind(this),
      QueuePriority.VERY_LOW,
    );
  }

  async addOneEvent(event: BanEvent | MatchEvent): Promise<void> {
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

    this.isQueueProcessing = false;
  }

  private async computeAllStats(): Promise<void> {
    await this.computeStats();

    const configs = await this.configsService.findAll();
    for (const config of configs) {
      await this.computeStats(config._id);
    }
  }

  private async computeStats(configId?: string): Promise<void> {
    const id = configId ?? "global";
    const { bans } = await this.bansService.findAll(
      configId ? { configId } : {},
    );
    const { matches } = await this.matchesService.findAll(
      configId ? { configId } : {},
    );

    this.computeDailyStats(matches, bans, id);
    this.computeWeeklyStats(matches, bans, id);
    this.computeMonthlyStats(matches, bans, id);
  }

  private async computeDailyStats(
    matches: MatchSchema[],
    bans: BanSchema[],
    configId?: string,
  ): Promise<void> {
    const stats: StatsTimelineResponse = {
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

  private async computeWeeklyStats(
    matches: MatchSchema[],
    bans: BanSchema[],
    configId?: string,
  ): Promise<void> {
    const stats: StatsTimelineResponse = {
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

  private async computeMonthlyStats(
    matches: MatchSchema[],
    bans: BanSchema[],
    configId?: string,
  ): Promise<void> {
    const stats: StatsTimelineResponse = {
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
        new Date(date).setMonth(date.getMonth() - SAMPLE_SIZE + i),
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
