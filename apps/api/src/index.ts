import "reflect-metadata";

import "@/controllers/ConfigController";
import { TYPES } from "@/di";
import { ConfigService } from "@/services/ConfigService";
import { SQLiteService } from "@/services/SQLiteService";
import bodyParser from "body-parser";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";
import { BackgroundTaskScheduler } from "./monitoring/BackgroundTaskScheduler";

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
  .bind<BackgroundTaskScheduler>(TYPES.BackgroundTaskScheduler)
  .to(BackgroundTaskScheduler)
  .inSingletonScope();

// create server
const server = new InversifyExpressServer(container);
server.setConfig((app) => {
  // add body parser
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

  // start background task scheduler
  const backgroundTaskScheduler = container.get<BackgroundTaskScheduler>(
    TYPES.BackgroundTaskScheduler,
  );
  await backgroundTaskScheduler.start();
});
