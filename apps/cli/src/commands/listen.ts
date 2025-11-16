import type { Event } from "@banalize/grpc-types";
import chalk from "chalk";
import { Command } from "commander";
import { createEventsClient } from "../grpc/client.js";

export function listenCommand(): Command {
  const command = new Command("listen")
    .description("Listen for events (match, ban, unban)")
    .option("--match", "Only show match events")
    .option("--ban", "Only show ban events")
    .option("--unban", "Only show unban events")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createEventsClient(serverAddress);

      const showMatch =
        (!options.match && !options.ban && !options.unban) || options.match;
      const showBan =
        (!options.match && !options.ban && !options.unban) || options.ban;
      const showUnban =
        (!options.match && !options.ban && !options.unban) || options.unban;

      console.log(chalk.blue("Listening for events..."));
      console.log(chalk.gray(`Server: ${serverAddress}`));
      console.log(chalk.gray("Press Ctrl+C to stop\n"));

      const stream = client.streamEvents({});

      stream.on("data", (event: Event) => {
        // Generated types use snake_case to match proto-loader output
        const match = event.match;
        const ban = event.ban;
        const unban = event.unban;

        const timestamp = new Date(
          Number(match?.timestamp || ban?.timestamp || unban?.timestamp || 0),
        ).toISOString();

        if (match && showMatch) {
          console.log(chalk.yellow(`[MATCH] ${timestamp}`));
          console.log(`  Event ID: ${match.event_id}`);
          console.log(`  Config ID: ${match.config_id}`);
          console.log(`  IP: ${chalk.cyan(match.ip)}`);
          console.log(`  Regex: ${match.regex}`);
          console.log(`  Line: ${chalk.gray(match.line)}`);
          console.log();
        }

        if (ban && showBan) {
          console.log(chalk.red(`[BAN] ${timestamp}`));
          console.log(`  Event ID: ${ban.event_id}`);
          console.log(`  Config ID: ${ban.config_id}`);
          console.log(`  IP: ${chalk.cyan(ban.ip)}`);
          console.log();
        }

        if (unban && showUnban) {
          console.log(chalk.green(`[UNBAN] ${timestamp}`));
          console.log(`  Event ID: ${unban.event_id}`);
          console.log(`  Config ID: ${unban.config_id}`);
          console.log(`  IP: ${chalk.cyan(unban.ip)}`);
          console.log();
        }
      });

      stream.on("error", (error: Error) => {
        console.error(chalk.red(`Stream error: ${error.message}`));
        process.exit(1);
      });

      stream.on("end", () => {
        console.log(chalk.gray("\nStream ended"));
      });

      // Handle graceful shutdown
      process.on("SIGINT", () => {
        console.log(chalk.gray("\nStopping..."));
        stream.cancel();
        process.exit(0);
      });
    });

  return command;
}
