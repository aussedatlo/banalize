import { NotifierConfigSchema } from "@banalize/types";
import { Logger } from "@nestjs/common";
import axios from "axios";
import { Notification } from "src/notifications/interfaces/notification.interface";
import { Notifier } from "src/notifications/interfaces/notifier.interface";

export class SignalNotifierService implements Notifier {
  private readonly logger: Logger = new Logger(SignalNotifierService.name);

  constructor(private readonly config: NotifierConfigSchema) {
    this.logger.log(
      `SignalNotifierService created for server ${config.signalConfig.server}`,
    );
  }

  async notify({ message, title }: Notification): Promise<boolean> {
    this.logger.debug(`SignalNotifierService: ${message}`);
    try {
      axios.post(this.config.signalConfig.server, {
        message: `${title}\n${message}`,
        number: this.config.signalConfig.number,
        recipients: this.config.signalConfig.recipients,
      });
      return true;
    } catch (_) {
      this.logger.error(`Failed to send signal`);
      return false;
    }
  }
}
