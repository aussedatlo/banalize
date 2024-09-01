import { IBackgroundTask } from "@/background/tasks/IBackgroundTask";
import { TYPES } from "@/di";
import { inject, injectable } from "inversify";

const INTERVAL = 1000 * 60;

@injectable()
export class PeriodicTaskManager {
  private intervalId?: NodeJS.Timeout;

  constructor(@inject(TYPES.BackgroundTask) private task: IBackgroundTask) {
    this.intervalId = undefined;
  }

  start() {
    this.intervalId = setInterval(() => {
      this.task.execute();
    }, INTERVAL);
  }

  stop() {
    clearInterval(this.intervalId);
  }
}
