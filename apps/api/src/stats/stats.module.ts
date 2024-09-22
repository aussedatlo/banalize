import { Module } from "@nestjs/common";
import { BansModule } from "src/bans/bans.module";
import { ConfigsModule } from "src/configs/configs.module";
import { MatchesModule } from "src/matches/matches.module";
import { StatsCountService } from "./stats-count.service";
import { StatsHistoryService } from "./stats-history.service";
import { StatsController } from "./stats.controller";

@Module({
  imports: [MatchesModule, BansModule, ConfigsModule],
  controllers: [StatsController],
  providers: [StatsHistoryService, StatsCountService],
})
export class StatsModule {}
