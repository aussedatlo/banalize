import { StatsSummary } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { BansService } from "src/bans/bans.service";
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

    const activeBans = await this.bansService.findAll(
      configId ? { configId, active: true } : { active: true },
    );
    const recentMatches = await this.matchesService.findAll(
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
      allBansCount: allBans.length,
      allMatchesCount: allMatches.length,
      activeBansCount: activeBans.length,
      recentMatchesCount: recentMatches.length,
    };
  }
}
