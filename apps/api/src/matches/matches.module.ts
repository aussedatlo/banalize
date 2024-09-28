import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SharedModule } from "src/shared/shared.module";
import { MatchesController } from "./matches.controller";
import { MatchSchema, MatchSchemaDefinition } from "./schemas/match.schema";
import { MatchEventHandlerService } from "./services/match-event-handler.service";
import { MatchesService } from "./services/matches.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MatchSchema.name, schema: MatchSchemaDefinition },
    ]),
    SharedModule,
  ],
  controllers: [MatchesController],
  providers: [MatchEventHandlerService, MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
