#!/usr/bin/env node

import { Command } from "commander";
import { createConfigCommand } from "./commands/create.js";
import { listCommand } from "./commands/list.js";
import { listBansCommand } from "./commands/list-bans.js";
import { listMatchesCommand } from "./commands/list-matches.js";
import { listenCommand } from "./commands/listen.js";
import { pingCommand } from "./commands/ping.js";
import { updateConfigCommand } from "./commands/update.js";

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
