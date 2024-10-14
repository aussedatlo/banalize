import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { BansModule } from "./bans/bans.module";
import { ConfigsModule } from "./configs/configs.module";
import { EventsModule } from "./events/events.module";
import { FirewallModule } from "./firewall/firewall.module";
import { IpInfosModule } from "./ip-infos/ip-infos.module";
import { MatchesModule } from "./matches/matches.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SharedModule } from "./shared/shared.module";
import { StatsModule } from "./stats/stats.module";
import { UnbansModule } from "./unbans/unbans.module";
import { WatchersModule } from "./watchers/watchers.module";

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.BANALIZE_API_MONGO_URI),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    SharedModule,
    ConfigsModule,
    MatchesModule,
    WatchersModule,
    BansModule,
    UnbansModule,
    FirewallModule,
    IpInfosModule,
    StatsModule,
    EventsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
