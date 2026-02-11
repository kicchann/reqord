import { Command } from "commander";
import { syncCommand } from "./sync.js";
import { feedbackListCommand } from "./list.js";
import { feedbackShowCommand } from "./show.js";
import { feedbackLinkCommand } from "./link.js";
import { feedbackCloseCommand } from "./close.js";
import { resolveCommand } from "./resolve.js";

export const feedbackCommand = new Command("feedback")
  .description("Manage feedback from GitHub issues");

feedbackCommand.addCommand(syncCommand);
feedbackCommand.addCommand(feedbackListCommand);
feedbackCommand.addCommand(feedbackShowCommand);
feedbackCommand.addCommand(feedbackLinkCommand);
feedbackCommand.addCommand(feedbackCloseCommand);
feedbackCommand.addCommand(resolveCommand);
