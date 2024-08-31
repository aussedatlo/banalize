import { injectable } from "inversify";
import { Either, Left, Right } from "purify-ts";
import sqlite3 from "sqlite3";

@injectable()
export class SQLiteService {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(":memory:");
  }

  exec = async <T>(
    command: "get" | "all" | "run",
    query: string,
  ): Promise<Either<Error, T>> =>
    new Promise<Either<Error, T>>((resolve) => {
      this.db[command](query, (err: Error | null, res: T) => {
        if (err) {
          return resolve(Left(err));
        }
        return resolve(Right(res));
      });
    });

  all = async <T>(query: string): Promise<Either<Error, T[]>> =>
    this.exec("all", query);
  get = async <T>(query: string): Promise<Either<Error, T>> =>
    this.exec("get", query);
  run = async (query: string): Promise<Either<Error, void>> =>
    this.exec("run", query);
}
