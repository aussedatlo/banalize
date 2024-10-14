import { EventStatus } from "../enums/event-status.enum";
import { EventType } from "../enums/event-type.enum";

export type EventFiltersDto = {
  configId: string;
  type?: EventType[];
  status?: EventStatus[];
  ip?: string;
  page?: number;
  limit?: number;
};
