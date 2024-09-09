import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { BansModule } from "./bans/bans.module";
import { ConfigsModule } from "./configs/configs.module";
import { FirewallModule } from "./firewall/firewall.module";
import { MatchesModule } from "./matches/matches.module";
import { WatchersModule } from "./watchers/watchers.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_URI),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigsModule,
    MatchesModule,
    WatchersModule,
    BansModule,
    FirewallModule,
  ],
})
export class AppModule {}
