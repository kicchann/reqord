import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { showRequirement } from "../../services/requirement-service.js";
import { handleError } from "../../utils/error-handler.js";

const STATUS_COLORS: Record<string, (s: string) => string> = {
  draft: chalk.blue,
  pending_approval: chalk.yellow,
  approved: chalk.green,
  implemented: chalk.cyan,
  deprecated: chalk.gray,
};

export const historyCommand = new Command("history")
  .description("Show requirement version history")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--json", "Output as JSON")
  .action(async (id: string, options: { json?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await showRequirement(cwd, id);
      const { versionHistory } = result.requirement;

      if (options.json) {
        console.log(JSON.stringify(versionHistory, null, 2));
        return;
      }

      if (versionHistory.length === 0) {
        console.log(chalk.gray(`No version history for ${id}.`));
        return;
      }

      console.log(chalk.cyan(`Version History: ${id}`));
      console.log("");

      const table = new Table({
        head: ["Version", "Status", "Date", "Summary"],
        style: { head: ["cyan"] },
      });

      for (const entry of versionHistory) {
        const statusColor = STATUS_COLORS[entry.status] ?? ((s: string) => s);
        table.push([
          entry.version,
          statusColor(entry.status),
          new Date(entry.changedAt).toLocaleString(),
          entry.summary.length > 50
            ? entry.summary.slice(0, 47) + "..."
            : entry.summary,
        ]);
      }

      console.log(table.toString());
      console.log(
        chalk.gray(`\n${versionHistory.length} version(s) found.`),
      );
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
