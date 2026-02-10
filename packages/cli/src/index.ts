#!/usr/bin/env node

import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { createCommand } from "./commands/req/create.js";
import { listCommand } from "./commands/req/list.js";
import { showCommand } from "./commands/req/show.js";
import { updateCommand } from "./commands/req/update.js";
import { deleteCommand } from "./commands/req/delete.js";
import { validateCommand } from "./commands/req/validate.js";
import { historyCommand } from "./commands/req/history.js";
import { approveCommand } from "./commands/req/approve.js";
import { contextInitCommand } from "./commands/context/init.js";
import { contextShowCommand } from "./commands/context/show.js";
import { contextUpdateCommand } from "./commands/context/update.js";
import { specCreateCommand } from "./commands/spec/create.js";
import { specListCommand } from "./commands/spec/list.js";
import { specShowCommand } from "./commands/spec/show.js";
import { specDesignCommand } from "./commands/spec/design.js";
import { specApproveCommand } from "./commands/spec/approve.js";
import { feedbackCommand } from "./commands/feedback/index.js";
import { issueCommand } from "./commands/issue/index.js";
import { ensureReqordInitialized } from "./middleware/reqord-check.js";

const program = new Command();

program
  .name("reqord")
  .description("Requirements management CLI")
  .version("0.1.0");

program.addCommand(initCommand);

const reqCommand = new Command("req").description(
  "Manage requirements",
);
reqCommand.addCommand(createCommand);
reqCommand.addCommand(listCommand);
reqCommand.addCommand(showCommand);
reqCommand.addCommand(updateCommand);
reqCommand.addCommand(deleteCommand);
reqCommand.addCommand(validateCommand);
reqCommand.addCommand(historyCommand);
reqCommand.addCommand(approveCommand);

reqCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(reqCommand);

const contextCommand = new Command("context").description(
  "Manage project context",
);
contextCommand.addCommand(contextInitCommand);
contextCommand.addCommand(contextShowCommand);
contextCommand.addCommand(contextUpdateCommand);

contextCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(contextCommand);

const specCommand = new Command("spec").description(
  "Manage specifications",
);
specCommand.addCommand(specCreateCommand);
specCommand.addCommand(specListCommand);
specCommand.addCommand(specShowCommand);
specCommand.addCommand(specDesignCommand);
specCommand.addCommand(specApproveCommand);

specCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(specCommand);

feedbackCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(feedbackCommand);

issueCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(issueCommand);

program.parse();
