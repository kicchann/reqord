import { Command } from "commander";
import chalk from "chalk";
import {
  unlinkFromRequirement,
  unlinkFromSpecification,
} from "../../services/feedback-service.js";
import { handleError } from "../../utils/error-handler.js";
import { parseIssueNumber } from "../../utils/display.js";

export const feedbackUnlinkCommand = new Command("unlink")
  .description("Unlink feedback from requirement or specification (reverse of link)")
  .argument("<issue-number>", "GitHub issue number")
  .option("--req <id>", "Unlink from requirement")
  .option("--spec <id>", "Unlink from specification")
  .action(async (issueNumberStr: string, options: {
    req?: string;
    spec?: string;
  }) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseIssueNumber(issueNumberStr);

      // Mutual exclusion check
      const modes = [options.req, options.spec].filter(Boolean);
      if (modes.length !== 1) {
        throw new Error("Specify exactly one of --req or --spec");
      }

      if (options.req) {
        await unlinkFromRequirement(cwd, {
          issueNumber,
          requirementId: options.req,
        });
        console.log(chalk.green(`✓ Unlinked Feedback #${issueNumber} from ${options.req}`));
        console.log(chalk.gray(`  Removed feedback-review flag from ${options.req}`));
      } else if (options.spec) {
        await unlinkFromSpecification(cwd, {
          issueNumber,
          specificationId: options.spec,
        });
        console.log(chalk.green(`✓ Unlinked Feedback #${issueNumber} from ${options.spec}`));
        console.log(chalk.gray(`  Removed feedback-review flag from ${options.spec}`));
      }
    } catch (error) {
      handleError(error);
    }
  });
