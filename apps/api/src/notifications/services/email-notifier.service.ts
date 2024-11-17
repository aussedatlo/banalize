import { NotifierConfigSchema } from "@banalize/types";
import { Logger } from "@nestjs/common";
import { createTransport, Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { Notification } from "src/notifications/interfaces/notification.interface";
import { Notifier } from "src/notifications/interfaces/notifier.interface";

export class EmailNotifierService implements Notifier {
  private readonly logger: Logger = new Logger(EmailNotifierService.name);
  private readonly transporter: Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
  >;

  constructor(private readonly config: NotifierConfigSchema) {
    this.logger.log(
      `EmailNotifierService created for username ${config.emailConfig.username}`,
    );
    const { username, password, port, server } = config.emailConfig;
    this.transporter = createTransport({
      host: server,
      port,
      secure: port === 465, // true for port 465, false for other ports
      auth: {
        user: username,
        pass: password,
      },
    });
  }

  async notify({ message, title }: Notification) {
    this.logger.debug(`EmailNotifierService: ${message}`);
    const { username, recipientEmail } = this.config.emailConfig;
    try {
      await this.transporter.sendMail({
        from: username,
        to: recipientEmail,
        subject: title,
        text: message,
      });
    } catch (error) {
      this.logger.error(`Failed to send email: ${error}`);
    }
  }
}
