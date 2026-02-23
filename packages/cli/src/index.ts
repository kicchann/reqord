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
import { draftCommand } from "./commands/req/draft.js";
import { implementCommand } from "./commands/req/implement.js";
import { contextInitCommand } from "./commands/context/init.js";
import { contextShowCommand } from "./commands/context/show.js";
import { contextUpdateCommand } from "./commands/context/update.js";
import { specCreateCommand } from "./commands/spec/create.js";
import { specListCommand } from "./commands/spec/list.js";
import { specShowCommand } from "./commands/spec/show.js";
import { specDesignCommand } from "./commands/spec/design.js";
import { specApproveCommand } from "./commands/spec/approve.js";
import { updateCommand as specUpdateCommand } from "./commands/spec/update.js";
import { draftCommand as specDraftCommand } from "./commands/spec/draft.js";
import { implementCommand as specImplementCommand } from "./commands/spec/implement.js";
import { historyCommand as specHistoryCommand } from "./commands/spec/history.js";
import { specValidateCommand } from "./commands/spec/validate.js";
import { coverageCommand } from "./commands/spec/coverage.js";
import { feedbackCommand } from "./commands/feedback/index.js";
import { taskCommand } from "./commands/task/index.js";
import { migrateToYamlCommand } from "./commands/migrate-to-yaml.js";
import { impactCommand } from "./commands/impact/index.js";
import { versionCommand } from "./commands/version/version.js";
import { uiCommand } from "./commands/ui.js";
import { statusCommand } from "./commands/status.js";
import { implValidateCommand } from "./commands/validate/impl.js";
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
reqCommand.addCommand(draftCommand);
reqCommand.addCommand(implementCommand);

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
specCommand.addCommand(specUpdateCommand);
specCommand.addCommand(specDesignCommand);
specCommand.addCommand(specApproveCommand);
specCommand.addCommand(specDraftCommand);
specCommand.addCommand(specImplementCommand);
specCommand.addCommand(specHistoryCommand);
specCommand.addCommand(specValidateCommand);
specCommand.addCommand(coverageCommand);

specCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(specCommand);

feedbackCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(feedbackCommand);

taskCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(taskCommand);

program.addCommand(migrateToYamlCommand);

impactCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(impactCommand);

versionCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});
program.addCommand(versionCommand);

uiCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});
program.addCommand(uiCommand);

statusCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});
program.addCommand(statusCommand);

const validateGroupCommand = new Command("validate").description(
  "Validate implementation and design",
);
validateGroupCommand.addCommand(implValidateCommand);

validateGroupCommand.hook("preAction", async () => {
  await ensureReqordInitialized(process.cwd());
});

program.addCommand(validateGroupCommand);

program.parse();
