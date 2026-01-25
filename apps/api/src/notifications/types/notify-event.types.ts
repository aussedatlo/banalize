import { EventType } from "@banalize/types";

export class NotifyEvent {
  constructor(
    readonly type: EventType,
    readonly title: string,
    readonly message: string,
    readonly html?: string,
  ) {}
}
