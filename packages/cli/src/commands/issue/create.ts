import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { createIssuesFromSpec, type CreateIssuesResult } from "../../services/issue-service.js";
import { handleError } from "../../utils/error-handler.js";

export const issueCreateCommand = new Command("create")
  .description("Create GitHub issues from a task definition file")
  .argument("<spec-id>", "Specification ID (e.g., spec-000016)")
  .requiredOption("--tasks-file <path>", "Path to task definition file")
  .option("--dry-run", "Preview without creating issues")
  .option("--json", "Output as JSON")
  .option("--max-issues <n>", "Maximum number of issues to create", "20")
  .action(async (specId: string, options) => {
    try {
      const cwd = process.cwd();
      const result = await createIssuesFromSpec(cwd, {
        specId,
        tasksFile: options.tasksFile,
        dryRun: options.dryRun,
        maxIssues: parseInt(options.maxIssues, 10),
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        displayResult(result, options.dryRun);
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });

function displayResult(result: CreateIssuesResult, dryRun?: boolean): void {
  if (dryRun) {
    console.log(chalk.yellow("Dry run - no issues created\n"));
  } else {
    console.log(chalk.green(`Created ${result.issues.length} issues for ${result.specId}\n`));
  }

  const table = new Table({
    head: dryRun
      ? ["#", "Title", "Priority", "Est. Hours", "Labels"]
      : ["#", "Title", "Priority", "Est. Hours", "Issue#", "URL"],
  });

  result.issues.forEach((issue, index) => {
    if (dryRun) {
      table.push([index + 1, issue.title, issue.priority, issue.estimatedHours, issue.labels.join(", ")]);
    } else {
      table.push([index + 1, issue.title, issue.priority, issue.estimatedHours, issue.number ?? "-", issue.url ?? "-"]);
    }
  });

  console.log(table.toString());
  console.log(`\nTotal estimated hours: ${result.totalEstimatedHours}`);
}
