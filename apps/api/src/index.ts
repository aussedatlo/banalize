import "reflect-metadata";

import "@/controllers/ConfigController";
import { TYPES } from "@/di";
import { ConfigService } from "@/services/ConfigService";
import { SQLiteService } from "@/services/SQLiteService";
import bodyParser from "body-parser";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { PeriodicTaskManager } from "./background/managers/PeriodicTaskManager";
import { RegexMonitorManager } from "./background/managers/RegexMonitorManager";
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
  .bind<ConfigService>(TYPES.ConfigService)
  .to(ConfigService)
  .inSingletonScope();
container
  .bind<IFirewallService>(TYPES.FirewallService)
  .to(IPTablesService)
  .inSingletonScope();

container
  .bind<RegexMonitorManager>(TYPES.RegexMonitorManager)
  .to(RegexMonitorManager);
container
  .bind<PeriodicTaskManager>(TYPES.PeriodicTaskManager)
  .to(PeriodicTaskManager);
container.bind<IBackgroundTask>(TYPES.BackgroundTask).to(UnbanTask);

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
  await container.get<RegexMonitorManager>(TYPES.RegexMonitorManager).start();
  container.get<PeriodicTaskManager>(TYPES.PeriodicTaskManager).start();
});
