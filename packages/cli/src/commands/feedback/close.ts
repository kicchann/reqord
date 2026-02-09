import { Command } from "commander";
import chalk from "chalk";
import { closeFeedback } from "../../services/feedback-service.js";
import { handleError } from "../../utils/error-handler.js";

export const feedbackCloseCommand = new Command("close")
  .description("Close feedback (updates index.json and closes GitHub Issue)")
  .argument("<issue-number>", "GitHub issue number")
  .action(async (issueNumberStr: string) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      if (isNaN(issueNumber)) {
        throw new Error("Invalid issue number");
      }

      await closeFeedback(cwd, issueNumber);

      console.log(chalk.green(`✓ Closed Feedback #${issueNumber}`));
      console.log(chalk.gray("  Flags remain on linked requirements"));
    } catch (error) {
      handleError(error);
    }
  });
