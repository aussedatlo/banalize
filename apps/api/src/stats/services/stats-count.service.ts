import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BansService } from "src/bans/bans.service";
import { ConfigsService } from "src/configs/configs.service";
import { MatchesService } from "src/matches/services/matches.service";
import { StatsCountRecordModel } from "src/stats/models/stats-count-record.model";

@Injectable()
export class StatsCountService implements OnModuleInit {
  private readonly logger = new Logger(StatsCountService.name);
  private record: StatsCountRecordModel = { data: {} };

  constructor(
    private readonly matchesService: MatchesService,
    private readonly bansService: BansService,
    private readonly configsService: ConfigsService,
  ) {}

  getStats(): StatsCountRecordModel {
    return this.record;
  }

  async onModuleInit(): Promise<void> {
    this.logger.log("Computing stats on module init");
    const configs = await this.configsService.findAll();
    for (const config of configs) {
      await this.computeStats(config._id);
    }
  }

  async computeStats(configId: string): Promise<void> {
    const config = await this.configsService.findOne(configId);

    const currentBans = await this.bansService.findAll(
      configId ? { configId, active: true } : { active: true },
    );
    const currentMatches = await this.matchesService.findAll(
      configId
        ? {
            configId,
            timestamp_gt: new Date().getTime() - config.findTime * 1000,
          }
        : {},
    );

    const allBans = await this.bansService.findAll(
      configId ? { configId } : {},
    );
    const allMatches = await this.matchesService.findAll(
      configId ? { configId } : {},
    );

    this.record.data[configId] = {
      bansCount: allBans.length,
      matchesCount: allMatches.length,
      currentBansCount: currentBans.length,
      currentMatchesCount: currentMatches.length,
    };
  }
}
