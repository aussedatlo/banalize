import { Injectable, Logger } from "@nestjs/common";
import { NotifierFactory } from "src/notifications/notifier-factory";
import { NotifierConfigService } from "./notifier-config-service.service";

@Injectable()
export class NotifierTestService {
  private readonly logger: Logger = new Logger(NotifierTestService.name);

  constructor(
    private readonly factory: NotifierFactory,
    private readonly notifierConfigService: NotifierConfigService,
  ) {}

  async execute(id: string) {
    this.logger.log("NotifierTestService executed");
    const config = await this.notifierConfigService.findOne(id);

    if (!config) {
      throw new Error("Notifier config not found");
    }

    const notifier = this.factory.createNotifier(config);
    const result = await notifier.notify({
      title: "Banalize test title",
      message: "Banalize test message",
    });

    return result
      ? { message: "Notification sent", success: true }
      : { message: "Failed to send notification", success: false };
  }
}
