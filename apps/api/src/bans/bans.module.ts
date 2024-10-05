import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigsModule } from "src/configs/configs.module";
import { SharedModule } from "src/shared/shared.module";
import { BansController } from "./bans.controller";
import { BansService } from "./bans.service";
import { BanSchema, BanSchemaDefinition } from "./schemas/ban.schema";
import { BanCleanupService } from "./services/ban-cleanup.service";
import { BanEventHandlerService } from "./services/ban-event-handler.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BanSchema.name, schema: BanSchemaDefinition },
    ]),
    SharedModule,
    ConfigsModule,
  ],
  controllers: [BansController],
  providers: [BansService, BanEventHandlerService, BanCleanupService],
  exports: [BansService],
})
export class BansModule {}
