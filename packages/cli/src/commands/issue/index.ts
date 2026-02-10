import { Command } from "commander";
import { issueCreateCommand } from "./create.js";
import { issueSyncCommand, issueSyncAllCommand } from "./sync.js";
import { issueValidateCommand } from "./validate.js";

export const issueCommand = new Command("issue")
  .description("Manage GitHub issues for specifications");

issueCommand.addCommand(issueCreateCommand);
issueCommand.addCommand(issueSyncCommand);
issueCommand.addCommand(issueSyncAllCommand);
issueCommand.addCommand(issueValidateCommand);
