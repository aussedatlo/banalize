import { Module } from "@nestjs/common";
import { BansModule } from "src/bans/bans.module";
import { ConfigsModule } from "src/configs/configs.module";
import { MatchesModule } from "src/matches/matches.module";
import { StatsSummaryService } from "./services/stats-summary.service";
import { StatsTimelineService } from "./services/stats-timeline.service";
import { StatsController } from "./stats.controller";

@Module({
  imports: [MatchesModule, BansModule, ConfigsModule],
  controllers: [StatsController],
  providers: [StatsTimelineService, StatsSummaryService],
})
export class StatsModule {}
