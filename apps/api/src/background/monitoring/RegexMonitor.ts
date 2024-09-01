import { MatchEventHandler } from "@/background/handlers/MatchEventHandler";
import { TYPES } from "@/di";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { inject } from "inversify";
import { Just, Maybe, Nothing } from "purify-ts";
import { IRegexMonitor } from "./IRegexMonitor";

export class RegexMonitor implements IRegexMonitor {
  private process?: ChildProcessWithoutNullStreams;

  constructor(
    private command: string,
    private args: string[],
    private regex: string,
    @inject(TYPES.MatchEventHandler) private handler: MatchEventHandler,
  ) {}

  spawn(): void {
    console.log(`Spawning command: ${this.command}, args: ${this.args}`);
    this.process = spawn(this.command, this.args, {
      shell: true,
      detached: true,
      stdio: "pipe",
    });

    console.log(`Process spawned: ${this.process.pid}`);

    if (!this.process.stdout) {
      throw new Error("No stdout available");
    }

    this.process.stdout.on("data", async (data) => {
      const logs = data.toString().trim();
      const maybe = this._extractIp(this.regex, logs);
      maybe.map((ip: string) => {
        console.log(`Regex ${this.regex} matched: ${ip}`);
        this.handler.handle(ip, this.regex);
      });
      this.process?.kill();
    });

    this.process.on("error", (error) => {
      console.error(`Error executing command: ${error.message}`);
    });

    this.process.on("close", (code) => {
      console.log(`Process closed with code ${code}`);
      this.process = undefined;
    });
  }

  stop() {
    if (!this.process?.pid) return;
    try {
      process.kill(-this.process.pid);
    } catch (e) {
      console.log(e);
    }
  }

  _extractIp(pattern: string, input: string): Maybe<string> {
    // Replace the placeholder <IP> with a regex that matches an IP address
    const ipRegex = "\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b";
    const modifiedPattern = pattern.replace("<IP>", `(${ipRegex})`);

    // Create a RegExp object from the modified pattern
    const regex = new RegExp(modifiedPattern);

    // Search for the IP address in the input string
    const match = input.match(regex);

    if (match && match[1]) {
      return Just(match[1]); // Return the matched IP address
    } else {
      return Nothing; // Return Nothing if no IP address was found
    }
  }
}
