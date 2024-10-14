import { EventType } from "src/events";
import { NotifierEmailConfigSchema } from "./notifier-email-config.schema";
import { NotifierSignalConfigSchema } from "./notifier-signal-config.schema";

export type NotifierConfigSchema = {
  _id: string;
  events: EventType[];

  emailConfig?: NotifierEmailConfigSchema;
  signalConfig?: NotifierSignalConfigSchema;
};
