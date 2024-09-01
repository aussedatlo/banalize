import { TYPES } from "@/di";
import { SQLiteService } from "@/services/SQLiteService";
import { inject } from "inversify";
import { Either } from "purify-ts";

export class MatchEventRepository {
  constructor(@inject(TYPES.SQLiteService) private db: SQLiteService) {}

  async add(ip: string, regex: string): Promise<Either<Error, void>> {
    const query = `INSERT INTO events (ip, timestamp, regex) VALUES ("${ip}", "${new Date()}", "${regex}")`;
    return await this.db.run(query);
  }
}
