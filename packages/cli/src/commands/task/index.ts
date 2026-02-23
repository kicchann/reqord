import { Command } from "commander";
import { taskCreateCommand } from "./create.js";
import { taskFetchCommand } from "./fetch.js";
import { taskSyncCommand, taskSyncAllCommand } from "./sync.js";
import { taskValidateCommand } from "./validate.js";

export const taskCommand = new Command("task")
  .description("Manage GitHub issues as tasks for specifications");

taskCommand.addCommand(taskCreateCommand);
taskCommand.addCommand(taskFetchCommand);
taskCommand.addCommand(taskSyncCommand);
taskCommand.addCommand(taskSyncAllCommand);
taskCommand.addCommand(taskValidateCommand);
