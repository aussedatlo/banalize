import type { ConfigStatus } from "@banalize/grpc-types";
import chalk from "chalk";
import { Command } from "commander";
import { createCoreClient } from "../grpc/client.js";

export function listCommand(): Command {
  const command = new Command("list")
    .description("List all configurations")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createCoreClient(serverAddress);

      client.listConfig({}, (error, response) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        }

        if (response.configs.length === 0) {
          console.log(chalk.gray("No configurations found"));
          return;
        }

        console.log(
          chalk.blue(`Found ${response.configs.length} configuration(s):\n`),
        );

        response.configs.forEach((config: ConfigStatus) => {
          const status = config.running
            ? chalk.green("● Running")
            : chalk.red("○ Stopped");

          console.log(chalk.bold(config.name));
          console.log(`  ID: ${config.id}`);
          console.log(`  Status: ${status}`);
          console.log(`  Param: ${config.param}`);
          console.log(`  Regex: ${config.regex}`);
          console.log(`  Ban Time: ${config.ban_time}ms`);
          console.log(`  Find Time: ${config.find_time}ms`);
          console.log(`  Max Matches: ${config.max_matches}`);
          if (config.ignore_ips && config.ignore_ips.length > 0) {
            console.log(`  Ignore IPs: ${config.ignore_ips.join(", ")}`);
          }
          if (config.error) {
            console.log(chalk.red(`  Error: ${config.error}`));
          }
          console.log();
        });
      });
    });

  return command;
}
