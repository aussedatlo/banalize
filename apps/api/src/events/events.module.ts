import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BanSchema, BanSchemaDefinition } from "src/bans/schemas/ban.schema";
import { ConfigsModule } from "src/configs/configs.module";
import {
  MatchSchema,
  MatchSchemaDefinition,
} from "src/matches/schemas/match.schema";
import {
  UnbanSchema,
  UnbanSchemaDefinition,
} from "src/unbans/schemas/unban.schema";
import { EventsController } from "./events.controller";
import { EventsService } from "./services/events.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BanSchema.name, schema: BanSchemaDefinition },
      { name: MatchSchema.name, schema: MatchSchemaDefinition },
      { name: UnbanSchema.name, schema: UnbanSchemaDefinition },
    ]),
    ConfigsModule,
  ],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
