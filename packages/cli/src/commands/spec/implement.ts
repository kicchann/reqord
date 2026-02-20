import { Command } from "commander";
import chalk from "chalk";
import {
  updateSpecification,
  showSpecification,
  type UpdateSpecOptions,
} from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const implementCommand = new Command("implement")
  .description("Mark a specification as implemented")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--json", "Output result as JSON")
  .action(
    async (
      id: string,
      options: {
        json?: boolean;
      },
    ) => {
      const cwd = process.cwd();

      try {
        // Show current specification
        const { specification } = await showSpecification(cwd, id);

        // Precondition: status must be "approved"
        if (specification.status !== "approved") {
          throw new AppError(
            `Specification status is not "approved" (current: ${specification.status})`,
            ErrorCode.VALIDATION_ERROR,
          );
        }

        // Check implementation issues if present
        if (specification.implementation?.issues && specification.implementation.issues.length > 0 && !options.json) {
          const issues = specification.implementation.issues;
          const completedCount = issues.filter(issue => issue.status === "closed").length;

          console.log(chalk.cyan(`Related implementation issues (${issues.length}):`));
          for (const issue of issues) {
            const statusIcon = issue.status === "closed" ? "✓" : "○";
            const statusColor = issue.status === "closed" ? chalk.green : chalk.gray;
            console.log(statusColor(`  ${statusIcon} #${issue.number}: ${issue.title}`));
          }

          if (completedCount === 0) {
            console.log(chalk.yellow("\n⚠ Warning: All implementation issues are still open."));
            console.log(chalk.yellow("Proceeding with marking as implemented..."));
          } else if (completedCount < issues.length) {
            console.log(chalk.yellow(`\n⚠ Warning: ${issues.length - completedCount} issue(s) still open.`));
            console.log(chalk.yellow("Proceeding with marking as implemented..."));
          }
          console.log();
        }

        const updateOpts: UpdateSpecOptions = {
          status: "implemented",
        };

        const { before, after } = await updateSpecification(cwd, id, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Marked specification as implemented: ${id}`));
        console.log(`  status: ${before.status} → ${after.status}`);
        if (before.version !== after.version) {
          console.log(`  version: ${before.version} → ${after.version}`);
        }
        if (after.versionHistory.length > before.versionHistory.length) {
          const latestEntry = after.versionHistory[after.versionHistory.length - 1];
          console.log(`  history: ${latestEntry.summary}`);
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
