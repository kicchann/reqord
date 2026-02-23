import { Command } from "commander";
import chalk from "chalk";
import { syncSpecification, syncAll, type SyncResult } from "../../services/task-sync-service.js";
import { handleError } from "../../utils/error-handler.js";

export const taskSyncCommand = new Command("sync")
  .description("Sync GitHub issue status for a specification")
  .argument("<spec-id>", "Specification ID")
  .option("--json", "Output as JSON")
  .action(async (specId: string, options: { json?: boolean }) => {
    try {
      const cwd = process.cwd();
      const result = await syncSpecification(cwd, specId);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displaySyncResult(result);
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

export const taskSyncAllCommand = new Command("sync-all")
  .description("Sync GitHub issue status for all specifications")
  .option("--json", "Output as JSON")
  .action(async (options: { json?: boolean }) => {
    try {
      const cwd = process.cwd();
      const results = await syncAll(cwd);

      if (options.json) {
        console.log(JSON.stringify(results, null, 2));
      } else {
        if (results.length === 0) {
          console.log(chalk.yellow("No specifications with implementation found."));
          return;
        }
        for (const result of results) {
          displaySyncResult(result);
          console.log("");
        }
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

function displaySyncResult(result: SyncResult): void {
  console.log(chalk.bold(`Syncing ${result.specId}...`));

  for (const issue of result.synced) {
    const arrow = issue.changed ? chalk.yellow("→") : "-";
    const status = issue.changed
      ? `${issue.previousStatus} ${arrow} ${issue.currentStatus}`
      : issue.currentStatus;
    const icon = issue.changed ? chalk.green("✓") : "-";
    console.log(`  Issue #${issue.number}: "${issue.title}"  ${status}  ${icon}`);
  }

  for (const error of result.errors) {
    console.log(chalk.red(`  Issue #${error.issueNumber}: Error - ${error.message}`));
  }

  const { progress } = result;
  console.log(`\nProgress: ${progress.completed}/${progress.total} (${progress.percentage}%) completed`);
}
