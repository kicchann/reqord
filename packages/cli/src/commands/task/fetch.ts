import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { fetchIssues, type FetchResult } from "../../services/task-fetch-service.js";
import { handleError } from "../../utils/error-handler.js";

export const taskFetchCommand = new Command("fetch")
  .description("Fetch GitHub issues and update spec implementation data")
  .argument("[spec-id]", "Specification ID to fetch (e.g., spec-000022). Omit for all specs")
  .option("--dry-run", "Preview without writing to spec files")
  .option("--json", "Output as JSON")
  .action(async (specId: string | undefined, options) => {
    try {
      const cwd = process.cwd();
      const result = await fetchIssues(cwd, {
        specId,
        dryRun: options.dryRun,
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

function displayResult(result: FetchResult, dryRun?: boolean): void {
  if (dryRun) {
    console.log(chalk.yellow("Dry run - no files updated\n"));
  }

  console.log(
    `Fetched ${result.totalIssuesFetched} issues, ${result.totalIssuesWithTag} with reqord tags\n`,
  );

  if (result.specsUpdated.length > 0) {
    const table = new Table({
      head: ["Spec ID", "Issues", "Est. Hours", "Previous Issues", "Status"],
    });

    for (const spec of result.specsUpdated) {
      const change = spec.previousIssueCount !== spec.issueCount
        ? chalk.yellow(`${spec.previousIssueCount} → ${spec.issueCount}`)
        : String(spec.issueCount);

      table.push([
        spec.specId,
        change,
        spec.totalEstimatedHours,
        spec.previousIssueCount,
        spec.updated ? chalk.green("updated") : chalk.gray("preview"),
      ]);
    }

    console.log(table.toString());
  } else {
    console.log(chalk.gray("No specs to update."));
  }

  if (result.issuesWithoutSpec.length > 0) {
    console.log(chalk.yellow(`\nOrphan issues (spec not found locally):`));
    const orphanTable = new Table({
      head: ["Issue#", "Title", "Spec ID"],
    });

    for (const orphan of result.issuesWithoutSpec) {
      orphanTable.push([orphan.number, orphan.title, orphan.specId]);
    }

    console.log(orphanTable.toString());
  }
}
