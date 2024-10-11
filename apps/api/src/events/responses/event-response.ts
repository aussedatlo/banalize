import {
  type EventResponse as Event,
  EventStatus,
  EventType,
} from "@banalize/types";

export class EventResponse implements Event {
  type: EventType;
  _id: string;
  ip: string;
  timestamp: string;
  configId: string;
  status: EventStatus;
  line?: string;
}
