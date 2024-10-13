import { StatsSummary } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { BansService } from "src/bans/services/bans.service";
import { ConfigsService } from "src/configs/configs.service";
import { MatchesService } from "src/matches/services/matches.service";
import { StatsSummaryResponse } from "src/stats/responses/stats-summary.response";

@Injectable()
export class StatsSummaryService {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly bansService: BansService,
    private readonly configsService: ConfigsService,
  ) {}

  async getStats(): Promise<StatsSummaryResponse> {
    const record: StatsSummaryResponse = { data: {} };
    const configs = await this.configsService.findAll();
    for (const config of configs) {
      record.data[config._id] = await this.computeStats(config._id);
    }

    return record;
  }

  async computeStats(configId: string): Promise<StatsSummary> {
    const config = await this.configsService.findOne(configId);

    const { totalCount: activeBansCount } = await this.bansService.findAll(
      configId
        ? { configId, active: true, limit: 0 }
        : { active: true, limit: 0 },
    );
    const recentMatches = await this.matchesService.findAll(
      configId
        ? {
            configId,
            timestamp_gt: new Date().getTime() - config.findTime * 1000,
          }
        : {},
    );

    const { totalCount: allBansCount } = await this.bansService.findAll(
      configId ? { configId, limit: 0 } : { limit: 0 },
    );
    const allMatches = await this.matchesService.findAll(
      configId ? { configId } : {},
    );

    return {
      allBansCount,
      allMatchesCount: allMatches.length,
      activeBansCount,
      recentMatchesCount: recentMatches.length,
    };
  }
}
