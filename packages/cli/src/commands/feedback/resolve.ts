import { Command } from "commander";
import chalk from "chalk";
import { resolveFeedback } from "../../services/feedback-service.js";
import { handleError } from "../../utils/error-handler.js";

export const resolveCommand = new Command("resolve")
  .description("Resolve feedback flag on a requirement/specification")
  .argument("<artifact-id>", "Requirement or Specification ID (e.g., req-000006)")
  .requiredOption("--issue <number>", "GitHub issue number")
  .action(async (artifactId: string, options: { issue: string }) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(options.issue, 10);

      if (isNaN(issueNumber)) {
        throw new Error(`Invalid issue number: ${options.issue}`);
      }

      await resolveFeedback(cwd, { issueNumber, artifactId });

      console.log(
        chalk.green(
          `✓ Resolved feedback #${issueNumber} flag on ${artifactId}`,
        ),
      );
      console.log(chalk.gray(`  Removed feedback-review flag from ${artifactId}`));
      console.log(chalk.gray(`  Added ${artifactId} to linkedTo.resolved`));
    } catch (error) {
      handleError(error);
    }
  });
