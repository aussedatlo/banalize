import { Injectable } from "@nestjs/common";
import { BansService } from "src/bans/bans.service";
import { ConfigsService } from "src/configs/configs.service";
import { MatchesService } from "src/matches/services/matches.service";
import { StatsCountRecordModel } from "src/stats/models/stats-count-record.model";

@Injectable()
export class StatsCountService {
  private;

  constructor(
    private readonly matchesService: MatchesService,
    private readonly bansService: BansService,
    private readonly configsService: ConfigsService,
  ) {}

  async getStats(): Promise<StatsCountRecordModel> {
    const record: StatsCountRecordModel = { data: {} };
    const configs = await this.configsService.findAll();
    for (const config of configs) {
      record.data[config._id] = await this.computeStats(config._id);
    }

    return record;
  }

  async computeStats(configId: string) {
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

    return {
      bansCount: allBans.length,
      matchesCount: allMatches.length,
      currentBansCount: currentBans.length,
      currentMatchesCount: currentMatches.length,
    };
  }
}
