import { Module } from "@nestjs/common";
import { QueueService } from "./services/queue.service";

@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class SharedModule {}
