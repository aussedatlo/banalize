import { Injectable } from "@nestjs/common";
import { QueuePriority } from "src/shared/enums/priority.enum";

type EventQueueItemData<EventType> = EventType;
type EventQueueItemHandler<EventType> = (event: EventType) => Promise<void>;

interface EventQueueItem<EventType> {
  data: EventQueueItemData<EventType>;
  handler: EventQueueItemHandler<EventType>;
  priority: QueuePriority;
}

@Injectable()
export class QueueService {
  private queue: EventQueueItem<unknown>[] = [];
  private processing = false;

  enqueue<EventType>(
    data: EventQueueItemData<EventType>,
    handler: EventQueueItemHandler<EventType>,
    priority: QueuePriority,
  ) {
    this.queue.push({ handler, priority, data });
    this.queue.sort((a, b) => a.priority - b.priority);
    this.processQueue();
  }

  private async processQueue() {
    if (this.processing) return;

    const nextItem = this.queue.shift();
    if (!nextItem) return;

    this.processing = true;

    try {
      await nextItem.handler(nextItem.data);
    } finally {
      this.processing = false;
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }
}
