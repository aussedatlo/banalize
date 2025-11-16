import type { MatchRecord } from "@banalize/grpc-types";
import chalk from "chalk";
import { Command } from "commander";
import { createCoreClient } from "../grpc/client.js";

export function listMatchesCommand(): Command {
  const command = new Command("list-matches")
    .description("List all current matches")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createCoreClient(serverAddress);

      client.listCurrentMatches({}, (error, response) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        }

        if (response.matches.length === 0) {
          console.log(chalk.gray("No matches found"));
          return;
        }

        console.log(
          chalk.blue(`Found ${response.matches.length} match(es):\n`),
        );

        response.matches.forEach((match: MatchRecord) => {
          const timestamp = Number(match.timestamp);
          const date = isNaN(timestamp) ? null : new Date(timestamp);
          console.log(chalk.bold(`Config: ${match.config_id}`));
          console.log(`  IP: ${match.ip}`);
          console.log(`  Timestamp: ${match.timestamp}`);
          console.log(
            `  Date: ${date && !isNaN(date.getTime()) ? date.toISOString() : "Invalid date"}`,
          );
          console.log();
        });
      });
    });

  return command;
}
