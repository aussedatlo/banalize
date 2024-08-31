import "reflect-metadata";

import "@/controllers/ConfigController";
import { TYPES } from "@/di";
import { ConfigService } from "@/services/ConfigService";
import { SQLiteService } from "@/services/SQLiteService";
import bodyParser from "body-parser";
import { Container } from "inversify";
import { InversifyExpressServer } from "inversify-express-utils";

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
app.listen(3000);
