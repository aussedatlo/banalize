import { NotifierConfigSchema } from "@banalize/types";
import { Injectable } from "@nestjs/common";
import { EmailNotifierService } from "./services/email-notifier.service";
import { SignalNotifierService } from "./services/signal-notifier.service";

@Injectable()
export class NotifierFactory {
  constructor() {}

  createNotifier(config: NotifierConfigSchema) {
    if (config.emailConfig) return new EmailNotifierService(config);
    if (config.signalConfig) return new SignalNotifierService(config);
    throw new Error("Unknown notifier type");
  }
}
