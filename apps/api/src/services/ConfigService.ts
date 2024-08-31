import { TYPES } from "@/di";
import { Config } from "@/models/Config";
import { inject, injectable } from "inversify";
import { Either } from "purify-ts";
import { SQLiteService } from "./SQLiteService";

@injectable()
export class ConfigService {
  constructor(
    @inject(TYPES.SQLiteService) private databaseService: SQLiteService,
  ) {
    this._init();
  }

  _init = async () => {
    const result = await this.databaseService.run(
      `
            CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY,
            command TEXT NOT NULL,
            regex TEXT NOT NULL
            );
            `,
    );
    result.mapLeft((err) => {
      console.log(err);
    });
  };

  get = (): Promise<Either<Error, Config[]>> =>
    this.databaseService.all("SELECT * FROM config");

  create = (config: Config): Promise<Either<Error, void>> =>
    this.databaseService.run(
      `INSERT INTO config (command, regex) VALUES ("${config.command}", "${config.regex}")`,
    );
}
