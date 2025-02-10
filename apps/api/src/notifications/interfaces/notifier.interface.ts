import { Notification } from "./notification.interface";

export interface Notifier {
  notify: (notification: Notification) => Promise<boolean>;
}
