import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { MatchEventHandlerService } from "./match-event-handler.service";
import { MatchesController } from "./matches.controller";
import { MatchesService } from "./matches.service";
import { Match, MatchSchema } from "./schemas/match";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Match.name, schema: MatchSchema }]),
  ],
  controllers: [MatchesController],
  providers: [MatchEventHandlerService, MatchesService],
})
export class MatchesModule {}
