import { NotifierConfigSchema } from "@banalize/types";
import { Logger } from "@nestjs/common";
import { createTransport } from "nodemailer";
import { Notification } from "src/notifications/interfaces/notification.interface";
import { Notifier } from "src/notifications/interfaces/notifier.interface";

export class EmailNotifierService implements Notifier {
  private readonly logger: Logger = new Logger(EmailNotifierService.name);

  constructor(private readonly config: NotifierConfigSchema) {
    this.logger.log(
      `EmailNotifierService created for username ${config.emailConfig.username}`,
    );
  }

  async notify({ message, title }: Notification): Promise<boolean> {
    this.logger.debug(`EmailNotifierService: ${message}`);
    const { username, password, port, server, recipientEmail } =
      this.config.emailConfig;

    const transporter = createTransport({
      host: server,
      port,
      secure: port === 465, // true for port 465, false for other ports
      auth: {
        user: username,
        pass: password,
      },
    });

    try {
      await transporter.sendMail({
        from: username,
        to: recipientEmail,
        subject: title,
        text: message,
      });
      return true;
    } catch (_) {
      this.logger.error(`Failed to send email`);
      return false;
    }
  }
}
