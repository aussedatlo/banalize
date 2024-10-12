import { EventStatus, EventType } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BanSchema } from "src/bans/schemas/ban.schema";
import { ConfigsService } from "src/configs/configs.service";
import { MatchSchema } from "src/matches/schemas/match.schema";
import { UnbanSchema } from "src/unbans/schemas/unban.schema";
import { EventFiltersDto } from "../dtos/event-filters.dto";
import { EventResponse } from "../responses/event-response";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(BanSchema.name)
    private readonly banEventModel: Model<BanSchema>,
    @InjectModel(MatchSchema.name)
    private readonly matchModel: Model<MatchSchema>,
    @InjectModel(UnbanSchema.name)
    private readonly unbanModel: Model<UnbanSchema>,
    private readonly configsService: ConfigsService,
  ) {}

  async findAllByConfigId(
    filters: EventFiltersDto,
  ): Promise<{ events: EventResponse[]; totalCount: number }> {
    const config = await this.configsService.findOne(filters.configId);

    if (!config) {
      return { events: [], totalCount: 0 };
    }

    const recentThreshold = Date.now() - config.findTime * 1000;
    const filtersPipeline = [];

    filtersPipeline.push({ $match: { configId: filters.configId } });

    if (filters.type && filters.type.length > 0) {
      filtersPipeline.push({ $match: { type: { $in: filters.type } } });
    }

    if (filters.ip) {
      filtersPipeline.push({ $match: { ip: filters.ip } });
    }

    if (filters.status && filters.status.length > 0) {
      filtersPipeline.push({ $match: { status: { $in: filters.status } } });
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const matchPipeline = [
      {
        $project: {
          type: { $literal: EventType.MATCH },
          _id: 1,
          ip: 1,
          timestamp: 1,
          configId: 1,
          status: {
            $cond: {
              if: { $gte: ["$timestamp", recentThreshold] },
              then: EventStatus.RECENT,
              else: EventStatus.STALE,
            },
          },
          line: 1,
        },
      },
    ];

    // Add filters to matchPipeline
    if (filtersPipeline.length > 0) {
      matchPipeline.push(...filtersPipeline);
    }

    const banPipeline = [
      {
        $project: {
          type: { $literal: EventType.BAN },
          _id: 1,
          ip: 1,
          timestamp: 1,
          configId: 1,
          status: {
            $cond: {
              if: { $eq: ["$active", true] },
              then: EventStatus.ACTIVE,
              else: EventStatus.EXPIRED,
            },
          },
        },
      },
    ];

    // Add filters to banPipeline
    if (filtersPipeline.length > 0) {
      banPipeline.push(...filtersPipeline);
    }

    const unbanPipeline = [
      {
        $project: {
          type: { $literal: EventType.UNBAN },
          _id: 1,
          ip: 1,
          timestamp: 1,
          configId: 1,
          status: { $literal: EventStatus.UNBANNED },
        },
      },
    ];

    // Add filters to unbanPipeline
    if (filtersPipeline.length > 0) {
      unbanPipeline.push(...filtersPipeline);
    }

    const eventsPipeline = this.matchModel
      .aggregate<EventResponse>(matchPipeline)
      .unionWith({
        coll: this.banEventModel.collection.name,
        pipeline: banPipeline,
      })
      .unionWith({
        coll: this.unbanModel.collection.name,
        pipeline: unbanPipeline,
      })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const totalCountPipeline = this.matchModel
      .aggregate<{ totalCount: number }>(matchPipeline)
      .unionWith({
        coll: this.banEventModel.collection.name,
        pipeline: banPipeline,
      })
      .unionWith({
        coll: this.unbanModel.collection.name,
        pipeline: unbanPipeline,
      })
      .count("totalCount")
      .exec();

    const [events, [{ totalCount = 0 } = {}]] = await Promise.all([
      eventsPipeline,
      totalCountPipeline,
    ]);

    return { events, totalCount };
  }
}
