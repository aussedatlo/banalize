import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { SharedModule } from "src/shared/shared.module";
import { NotificationsController } from "./notifications.controller";
import { NotifierFactory } from "./notifier-factory";
import {
  NotifierConfigSchema,
  NotifierConfigSchemaDefinition,
} from "./schemas/notifier-config.schema";
import { NotifierConfigService } from "./services/notifier-config-service.service";
import { NotifierEventHandlerService } from "./services/notifier-event-handler.service";
import { NotifierManager } from "./services/notifier-manager.service";
import { NotifierTestService } from "./services/notifier-test-service.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NotifierConfigSchema.name,
        schema: NotifierConfigSchemaDefinition,
      },
    ]),
    SharedModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotifierManager,
    NotifierFactory,
    NotifierConfigService,
    NotifierTestService,
    NotifierEventHandlerService,
  ],
})
export class NotificationsModule {}
