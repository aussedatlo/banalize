import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigsController } from "./configs.controller";
import { ConfigsService } from "./configs.service";
import { ConfigSchema, ConfigSchemaDefinition } from "./schemas/config.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConfigSchema.name, schema: ConfigSchemaDefinition },
    ]),
  ],
  controllers: [ConfigsController],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
