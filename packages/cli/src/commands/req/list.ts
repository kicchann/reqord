import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { listRequirements } from "../../services/requirement-service.js";
import type { Status, Priority } from "@reqord/shared";
import { handleError } from "../../utils/error-handler.js";

const PRIORITY_COLORS: Record<string, (s: string) => string> = {
  high: chalk.red,
  medium: chalk.yellow,
  low: chalk.gray,
};

const STATUS_COLORS: Record<string, (s: string) => string> = {
  draft: chalk.blue,
  pending_approval: chalk.yellow,
  approved: chalk.green,
  deprecated: chalk.gray,
};

export const listCommand = new Command("list")
  .description("List requirements")
  .option("-s, --status <status>", "Filter by status")
  .option("-p, --priority <priority>", "Filter by priority")
  .option("--json", "Output as JSON")
  .action(
    async (options: {
      status?: string;
      priority?: string;
      json?: boolean;
    }) => {
      const cwd = process.cwd();

      try {
        const requirements = await listRequirements(cwd, {
          status: options.status as Status | undefined,
          priority: options.priority as Priority | undefined,
        });

        if (options.json) {
          console.log(JSON.stringify(requirements, null, 2));
          return;
        }

        if (requirements.length === 0) {
          console.log(chalk.gray("No requirements found."));
          return;
        }

        const table = new Table({
          head: ["ID", "Title", "Status", "Priority"],
          style: { head: ["cyan"] },
        });

        for (const req of requirements) {
          const statusColor = STATUS_COLORS[req.status] ?? ((s: string) => s);
          const priorityColor =
            PRIORITY_COLORS[req.priority] ?? ((s: string) => s);

          table.push([
            req.id,
            req.title.length > 40
              ? req.title.slice(0, 37) + "..."
              : req.title,
            statusColor(req.status),
            priorityColor(req.priority),
          ]);
        }

        console.log(table.toString());
        console.log(
          chalk.gray(`\n${requirements.length} requirement(s) found.`),
        );
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
