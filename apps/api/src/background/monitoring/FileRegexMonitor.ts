import { IRegexMonitor } from "./IRegexMonitor";
import { RegexMonitor } from "./RegexMonitor";

export class FileRegexMonitor extends RegexMonitor implements IRegexMonitor {
  constructor(filePath: string, regex: string) {
    super("tail", ["-f", filePath], regex);
  }
}
