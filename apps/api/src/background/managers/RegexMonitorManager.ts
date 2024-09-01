import { TYPES } from "@/di";
import { ConfigService } from "@/services/ConfigService";
import { inject, injectable } from "inversify";
import { FileRegexMonitor } from "../monitoring/FileRegexMonitor";
import { RegexMonitor } from "../monitoring/RegexMonitor";

@injectable()
export class RegexMonitorManager {
  private monitors: RegexMonitor[] = [];

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {}

  async start() {
    const either = await this.configService.get();

    this.monitors.forEach((monitor) => monitor.stop());

    either.map((configs) => {
      console.log(
        `Found ${configs.length} configs: ${JSON.stringify(configs)}`,
      );

      this.monitors = configs.map(
        (config) => new FileRegexMonitor(config.param, config.regex),
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
