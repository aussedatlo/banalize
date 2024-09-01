import { TYPES } from "@/di";
import { ConfigRepository } from "@/repositories/ConfigRepository";
import { inject, injectable } from "inversify";
import { RegexMonitor } from "../monitoring/RegexMonitor";

@injectable()
export class MatchMonitorManager {
  private monitors: RegexMonitor[] = [];

  constructor(
    @inject(TYPES.ConfigRepository) private configService: ConfigRepository,
    @inject(TYPES.RegexMonitorFactory)
    private monitorFactory: (param: string, regex: string) => RegexMonitor,
  ) {}

  async start() {
    const either = await this.configService.get();

    this.monitors.forEach((monitor) => monitor.stop());

    either.map((configs) => {
      console.log(
        `Found ${configs.length} configs: ${JSON.stringify(configs)}`,
      );

      this.monitors = configs.map((config) =>
        this.monitorFactory(config.param, config.regex),
      );

      this.monitors.forEach((watcher) => {
        setImmediate(() => {
          watcher.spawn();
        });
      });
    });
  }

  stop() {
    this.monitors.forEach((monitor) => monitor.stop());
  }
}
