import { Module } from "@nestjs/common";
import { ConfigsModule } from "src/configs/configs.module";
import { WatcherManagerService } from "./watcher-manager.service";
import { WatcherFactory } from "./watcher.factory";

@Module({
  imports: [ConfigsModule],
  providers: [WatcherFactory, WatcherManagerService],
})
export class WatchersModule {}
