import { Command } from "commander";
import chalk from "chalk";
import { notifyImpact } from "../../services/impact-service.js";
import type { NotifyResult } from "../../services/impact-service.js";
import { handleError } from "../../utils/error-handler.js";

export const notifyCommand = new Command("notify")
  .description("Notify impacted issues about requirement/specification changes")
  .argument("<id>", "Target ID (req-NNNNNN or spec-NNNNNN)")
  .option("--dry-run", "Preview notifications without sending")
  .option("--message <text>", "Custom notification message")
  .action(async (id: string, options: { dryRun?: boolean; message?: string }) => {
    try {
      const result = await notifyImpact(process.cwd(), id, {
        dryRun: options.dryRun,
        message: options.message,
      });
      displayNotifyResult(id, result);
    } catch (error) {
      handleError(error);
    }
  });

function displayNotifyResult(id: string, result: NotifyResult): void {
  if (result.notified.length === 0 && result.skipped.length === 0) {
    console.log(chalk.bold(`\nImpact notification: ${id}\n`));
    console.log("No issues to notify.");
    return;
  }

  if (result.dryRun) {
    displayDryRunResult(id, result);
  } else {
    displayActualResult(id, result);
  }
}

function displayDryRunResult(id: string, result: NotifyResult): void {
  console.log(chalk.bold(`\nImpact notification preview: ${id}\n`));

  if (result.notified.length > 0) {
    console.log("Notify targets:");
    for (const entry of result.notified) {
      console.log(`  #${entry.number}  ${entry.title}`);
    }
    console.log("");
  }

  if (result.skipped.length > 0) {
    console.log("Skipped:");
    for (const entry of result.skipped) {
      console.log(`  #${entry.number}  (${entry.reason})`);
    }
    console.log("");
  }

  // Show notification message preview
  const firstWithComment = result.notified.find((e) => e.comment);
  if (firstWithComment?.comment) {
    console.log(chalk.bold("Notification message:"));
    console.log(firstWithComment.comment);
    console.log("");
  }

  console.log("To actually send notifications, remove --dry-run and run again.");
}

function displayActualResult(id: string, result: NotifyResult): void {
  console.log(chalk.bold(`\nImpact notification: ${id}\n`));

  if (result.notified.length > 0) {
    console.log("Notified:");
    for (const entry of result.notified) {
      console.log(`  ✓ #${entry.number}  ${entry.title}`);
    }
    console.log("");
  }

  if (result.skipped.length > 0) {
    console.log("Skipped:");
    for (const entry of result.skipped) {
      console.log(`  - #${entry.number}  (${entry.reason})`);
    }
    console.log("");
  }

  console.log(`Sent ${result.notified.length} notification(s).`);
}
