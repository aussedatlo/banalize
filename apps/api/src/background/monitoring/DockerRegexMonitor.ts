import { MatchEventHandler } from "@/background/handlers/MatchEventHandler";
import { TYPES } from "@/di";
import { inject } from "inversify";
import { IRegexMonitor } from "./IRegexMonitor";
import { RegexMonitor } from "./RegexMonitor";

export class DockerRegexMonitor extends RegexMonitor implements IRegexMonitor {
  constructor(
    containerName: string,
    regex: string,
    @inject(TYPES.MatchEventHandler) handler: MatchEventHandler,
  ) {
    super("docker", ["logs", "-f", "-n0", containerName], regex, handler);
  }
}
