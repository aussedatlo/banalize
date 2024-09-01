import { IRegexMonitor } from "./IRegexMonitor";
import { RegexMonitor } from "./RegexMonitor";

export class DockerRegexMonitor extends RegexMonitor implements IRegexMonitor {
  constructor(containerName: string, regex: string) {
    super("docker", ["logs", "-f", "-n0", containerName], regex);
  }
}
