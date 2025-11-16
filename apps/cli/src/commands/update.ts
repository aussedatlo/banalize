import type { EditConfigRequest } from "@banalize/grpc-types";
import chalk from "chalk";
import { Command } from "commander";
import { createCoreClient } from "../grpc/client.js";

export function updateConfigCommand(): Command {
  const command = new Command("update")
    .description("Update an existing configuration")
    .requiredOption("-i, --id <id>", "Configuration ID")
    .option("-n, --name <name>", "Configuration name")
    .option("-p, --param <param>", "File path or resource to watch")
    .option(
      "-r, --regex <regex>",
      "Regex pattern (must contain <IP> placeholder)",
    )
    .option("--ban-time <ms>", "Ban time in milliseconds", parseInt)
    .option("--find-time <ms>", "Find time in milliseconds", parseInt)
    .option("--max-matches <count>", "Maximum matches before ban", parseInt)
    .option("--ignore-ips <ips>", "Comma-separated list of IPs/CIDRs to ignore")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createCoreClient(serverAddress);

      const request: EditConfigRequest = {
        id: options.id,
      };

      if (options.name) request.name = options.name;
      if (options.param) request.param = options.param;
      if (options.regex) request.regex = options.regex;
      if (options.banTime) request.ban_time = options.banTime;
      if (options.findTime) request.find_time = options.findTime;
      if (options.maxMatches) request.max_matches = options.maxMatches;
      if (options.ignoreIps) {
        request.ignore_ips = options.ignoreIps
          .split(",")
          .map((ip: string) => ip.trim());
      }

      client.editConfig(request, (error, response) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        }

        if (response.success) {
          console.log(
            chalk.green(`✓ Configuration "${options.id}" updated successfully`),
          );
        } else {
          console.error(chalk.red(`Error: ${response.error}`));
          process.exit(1);
        }
      });
    });

  return command;
}
