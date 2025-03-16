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
    // Insert event at the correct position (sorted by priority)
    let index = this.queue.findIndex((item) => item.priority > priority);
    if (index === -1) index = this.queue.length;
    this.queue.splice(index, 0, { handler, priority, data });

    this.processQueue();
  }

  private async processQueue() {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const nextItem = this.queue.shift();
      if (!nextItem) break;

      try {
        await nextItem.handler(nextItem.data);
      } catch (error) {
        console.error("Queue processing error:", error);
      }
    }

    this.processing = false;
  }
}
