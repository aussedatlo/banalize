import { MatchEventHandler } from "@/background/handlers/MatchEventHandler";
import { TYPES } from "@/di";
import { inject } from "inversify";
import { IRegexMonitor } from "./IRegexMonitor";
import { RegexMonitor } from "./RegexMonitor";

export class FileRegexMonitor extends RegexMonitor implements IRegexMonitor {
  constructor(
    filePath: string,
    regex: string,
    @inject(TYPES.MatchEventHandler) handler: MatchEventHandler,
  ) {
    super("tail", ["-f", filePath], regex, handler);
  }
}
