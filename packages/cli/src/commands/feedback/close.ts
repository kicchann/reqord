import { Command } from "commander";
import chalk from "chalk";
import { closeFeedback, checkRemainingFlags, showFeedback } from "../../services/feedback-service.js";
import { handleError } from "../../utils/error-handler.js";
import { parseIssueNumber } from "../../utils/display.js";

export const feedbackCloseCommand = new Command("close")
  .description("Close feedback (updates index.yaml and closes GitHub Issue)")
  .argument("<issue-number>", "GitHub issue number")
  .action(async (issueNumberStr: string) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseIssueNumber(issueNumberStr);

      // v3.0.0: Remaining flag warning
      const { feedback } = await showFeedback(cwd, issueNumber);
      const remainingFlags = await checkRemainingFlags(cwd, feedback);
      if (remainingFlags.length > 0) {
        console.log(
          chalk.yellow(
            `⚠ Warning: Linked artifacts have unresolved feedback:`,
          ),
        );
        for (const flag of remainingFlags) {
          console.log(
            chalk.yellow(
              `  - ${flag.artifactId}: unresolved (issue #${flag.issueNumber}, ${flag.severity})`,
            ),
          );
        }
      }

      await closeFeedback(cwd, issueNumber);

      console.log(chalk.green(`✓ Closed Feedback #${issueNumber}`));
      if (remainingFlags.length > 0) {
        console.log(chalk.gray("  Unresolved feedback remains. Use 'reqord feedback resolve' to mark as resolved."));
      }
    } catch (error) {
      handleError(error);
    }
  });
