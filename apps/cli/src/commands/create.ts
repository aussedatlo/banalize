import type { AddConfigRequest } from "@banalize/grpc-types";
import chalk from "chalk";
import { Command } from "commander";
import { createCoreClient } from "../grpc/client.js";

export function createConfigCommand(): Command {
  const command = new Command("create")
    .description("Create a new configuration")
    .requiredOption("-i, --id <id>", "Configuration ID")
    .requiredOption("-n, --name <name>", "Configuration name")
    .requiredOption("-p, --param <param>", "File path or resource to watch")
    .requiredOption(
      "-r, --regex <regex>",
      "Regex pattern (must contain <IP> placeholder)",
    )
    .requiredOption("--ban-time <ms>", "Ban time in milliseconds", parseInt)
    .requiredOption("--find-time <ms>", "Find time in milliseconds", parseInt)
    .requiredOption(
      "--max-matches <count>",
      "Maximum matches before ban",
      parseInt,
    )
    .option("--ignore-ips <ips>", "Comma-separated list of IPs/CIDRs to ignore")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createCoreClient(serverAddress);

      const ignoreIps = options.ignoreIps
        ? options.ignoreIps.split(",").map((ip: string) => ip.trim())
        : [];

      // Generated types use snake_case to match proto-loader output (keepCase: true)
      const request: AddConfigRequest = {
        id: options.id,
        name: options.name,
        param: options.param,
        regex: options.regex,
        ban_time: options.banTime,
        find_time: options.findTime,
        max_matches: options.maxMatches,
        ignore_ips: ignoreIps,
      };

      client.addConfig(request, (error, response) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        }

        if (response.success) {
          console.log(
            chalk.green(
              `✓ Configuration "${options.name}" created successfully`,
            ),
          );
        } else {
          console.error(chalk.red(`Error: ${response.error}`));
          process.exit(1);
        }
      });
    });

  return command;
}
