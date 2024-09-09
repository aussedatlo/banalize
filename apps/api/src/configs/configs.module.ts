import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigsController } from "./configs.controller";
import { ConfigsService } from "./configs.service";
import { Config, ConfigSchema } from "./schemas/config.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Config.name, schema: ConfigSchema }]),
  ],
  controllers: [ConfigsController],
  providers: [ConfigsService],
  exports: [ConfigsService],
})
export class ConfigsModule {}
