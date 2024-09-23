import { Module } from "@nestjs/common";
import { ConfigsModule } from "src/configs/configs.module";
import { WatcherManagerService } from "./services/watcher-manager.service";
import { WatcherFactory } from "./watcher.factory";
import { WatchersController } from "./watchers.controller";

@Module({
  imports: [ConfigsModule],
  controllers: [WatchersController],
  providers: [WatcherFactory, WatcherManagerService],
})
export class WatchersModule {}
