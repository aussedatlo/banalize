import { EventStatus } from "../enums/event-status.enum";
import { EventType } from "../enums/event-type.enum";

export type EventResponse = {
  type: EventType;
  _id: string;
  ip: string;
  timestamp: string;
  configId: string;
  status: EventStatus;
  line?: string;
};
