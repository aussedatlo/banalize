import type { BanRecord } from "@banalize/grpc-types";
import chalk from "chalk";
import { Command } from "commander";
import { createCoreClient } from "../grpc/client.js";

export function listBansCommand(): Command {
  const command = new Command("list-bans")
    .description("List all current bans")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createCoreClient(serverAddress);

      client.listCurrentBans({}, (error, response) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        }

        if (response.bans.length === 0) {
          console.log(chalk.gray("No bans found"));
          return;
        }

        console.log(chalk.blue(`Found ${response.bans.length} ban(s):\n`));

        response.bans.forEach((ban: BanRecord) => {
          const timestamp = Number(ban.timestamp);
          const date = isNaN(timestamp) ? null : new Date(timestamp);
          console.log(chalk.bold(`IP: ${ban.ip}`));
          console.log(`  Timestamp: ${ban.timestamp}`);
          console.log(
            `  Date: ${date && !isNaN(date.getTime()) ? date.toISOString() : "Invalid date"}`,
          );
          console.log();
        });
      });
    });

  return command;
}
