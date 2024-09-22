import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BanCleanupService } from "./ban-cleanup.service";
import { BanEventHandlerService } from "./ban-event-handler.service";
import { BansController } from "./bans.controller";
import { BansService } from "./bans.service";
import { Ban, BanSchema } from "./schemas/ban.schema";

@Module({
  imports: [MongooseModule.forFeature([{ name: Ban.name, schema: BanSchema }])],
  controllers: [BansController],
  providers: [BansService, BanEventHandlerService, BanCleanupService],
  exports: [BansService],
})
export class BansModule {}
