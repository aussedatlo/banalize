import { Module } from "@nestjs/common";
import { IpInfosController } from "./ip-infos.controller";
import { IpInfosService } from "./services/ip-infos.service";

@Module({
  imports: [],
  controllers: [IpInfosController],
  providers: [IpInfosService],
  exports: [IpInfosService],
})
export class IpInfosModule {}
