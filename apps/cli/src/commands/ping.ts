import chalk from "chalk";
import { Command } from "commander";
import { createCoreClient } from "src/grpc/client";

export function pingCommand(): Command {
  const command = new Command("ping")
    .description("Check if the server is reachable")
    .action(async (options, command) => {
      const serverAddress = command.parent?.opts().server || "localhost:50051";
      const client = createCoreClient(serverAddress);

      client.ping({}, (error, response) => {
        if (error) {
          console.error(chalk.red(`Error: ${error.message}`));
          process.exit(1);
        }

        console.log(chalk.green(`✓ Server is reachable`));
        console.log(chalk.gray(`Response: ${response.message}`));
      });
    });

  return command;
}
