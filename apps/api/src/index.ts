import "reflect-metadata";

import { IRegexMonitor } from "@/background/monitoring/IRegexMonitor";
import "@/controllers/ConfigController";
import { TYPES } from "@/di";
import { ConfigRepository } from "@/repositories/ConfigRepository";
import { MatchEventRepository } from "@/repositories/MatchEventRepository";
import { SQLiteService } from "@/services/SQLiteService";
import bodyParser from "body-parser";
import { Container, interfaces } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { MatchMonitorManager } from "./background/managers/MatchMonirorManager";
import { PeriodicTaskManager } from "./background/managers/PeriodicTaskManager";
import { IBackgroundTask } from "./background/tasks/IBackgroundTask";
import { UnbanTask } from "./background/tasks/UnbanTask";
import { IFirewallService } from "./services/firewall/IFirewallService";
import { IPTablesService } from "./services/firewall/IPTablesService";

const PORT = process.env.PORT || 3000;

// set up container
const container = new Container();

// set up bindings
container
  .bind<SQLiteService>(TYPES.SQLiteService)
  .to(SQLiteService)
  .inSingletonScope();
container
  .bind<IFirewallService>(TYPES.FirewallService)
  .to(IPTablesService)
  .inSingletonScope();

container
  .bind<ConfigRepository>(TYPES.ConfigRepository)
  .to(ConfigRepository)
  .inSingletonScope();
container
  .bind<MatchEventRepository>(TYPES.MatchEventRepository)
  .to(MatchEventRepository)
  .inSingletonScope();

container
  .bind<MatchMonitorManager>(TYPES.MatchMonitorManager)
  .to(MatchMonitorManager);
container
  .bind<PeriodicTaskManager>(TYPES.PeriodicTaskManager)
  .to(PeriodicTaskManager);
container.bind<IBackgroundTask>(TYPES.BackgroundTask).to(UnbanTask);

export type RegexMonitorType = "file" | "docker";

container
  .bind<interfaces.Factory<IRegexMonitor>>(TYPES.RegexMonitorFactory)
  .toFactory<IRegexMonitor, [RegexMonitorType]>((context) => {
    return (type: RegexMonitorType) =>
      type === "file"
        ? context.container.get<IRegexMonitor>(TYPES.FileRegexMonitor)
        : context.container.get<IRegexMonitor>(TYPES.DockerRegexMonitor);
  });

const server = new InversifyExpressServer(container);
server.setConfig((app) => {
  app.use(
    bodyParser.urlencoded({
      extended: true,
    }),
  );
  app.use(bodyParser.json());
});

const app = server.build();
app.listen(PORT, async () => {
  console.log(`Server started on http://localhost:${PORT}`);

  // start background tasks
  await container.get<MatchMonitorManager>(TYPES.MatchMonitorManager).start();
  container.get<PeriodicTaskManager>(TYPES.PeriodicTaskManager).start();
});
