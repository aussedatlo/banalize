#!/usr/bin/env node

import { Command } from "commander";
import { createConfigCommand } from "src/commands/create";
import { listCommand } from "src/commands/list";
import { listBansCommand } from "src/commands/list-bans";
import { listMatchesCommand } from "src/commands/list-matches";
import { listenCommand } from "src/commands/listen";
import { pingCommand } from "src/commands/ping";
import { updateConfigCommand } from "src/commands/update";

const program = new Command();

program
  .name("banalize-cli")
  .description("CLI tool for managing Banalize core service")
  .version("0.1.0")
  .option("-s, --server <address>", "gRPC server address", "localhost:50051");

program.addCommand(createConfigCommand());
program.addCommand(updateConfigCommand());
program.addCommand(listenCommand());
program.addCommand(listCommand());
program.addCommand(listBansCommand());
program.addCommand(listMatchesCommand());
program.addCommand(pingCommand());

program.parse();
