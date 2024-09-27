import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { UnbanSchema, UnbanSchemaDefinition } from "./schemas/unban.schema";
import { UnbansEventHandlerService } from "./services/unbans-event-handler.service";
import { UnbansService } from "./services/unbans.service";
import { UnbansController } from "./unbans.controller";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UnbanSchema.name, schema: UnbanSchemaDefinition },
    ]),
  ],
  controllers: [UnbansController],
  providers: [UnbansService, UnbansEventHandlerService],
  exports: [UnbansService],
})
export class UnbansModule {}
