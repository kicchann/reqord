import { Command } from "commander";
import chalk from "chalk";
import { showFeedback } from "../../services/feedback-service.js";
import { handleError } from "../../utils/error-handler.js";

export const feedbackShowCommand = new Command("show")
  .description("Show feedback details (GitHub Issue + index.json)")
  .argument("<issue-number>", "GitHub issue number")
  .option("--json", "Output as JSON")
  .action(async (issueNumberStr: string, options: { json?: boolean }) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      if (isNaN(issueNumber)) {
        throw new Error("Invalid issue number");
      }

      const result = await showFeedback(cwd, issueNumber);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(chalk.bold(`Issue #${result.issue.number}: ${result.issue.title}`));
      console.log(`  State:     ${result.issue.state}`);
      console.log(`  Type:      ${result.feedback.type ?? "(not set)"}`);
      console.log(`  Severity:  ${result.feedback.severity ?? "(not set)"}`);
      console.log(`  Requirements:  ${result.feedback.linkedTo.requirements.join(", ") || "(none)"}`);
      console.log(`  Specifications: ${result.feedback.linkedTo.specifications.join(", ") || "(none)"}`);
      console.log(`  Created Reqs:  ${result.feedback.linkedTo.createdRequirements.join(", ") || "(none)"}`);
      console.log(`  Created: ${result.issue.createdAt}`);
      console.log("");
      console.log(chalk.gray("--- Issue Body ---"));
      console.log(result.issue.body ?? "(empty)");
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
