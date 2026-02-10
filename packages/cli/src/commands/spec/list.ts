import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { listSpecifications } from "../../services/specification-service.js";
import type { Status } from "@reqord/shared";
import { handleError } from "../../utils/error-handler.js";
import { STATUS_COLORS, identityColor } from "../../utils/display.js";

export const specListCommand = new Command("list")
  .description("List specifications")
  .option("-s, --status <status>", "Filter by status")
  .option("-r, --requirement <req-id>", "Filter by requirement ID")
  .option("--json", "Output as JSON")
  .action(
    async (options: {
      status?: string;
      requirement?: string;
      json?: boolean;
    }) => {
      const cwd = process.cwd();

      try {
        const specifications = await listSpecifications(cwd, {
          status: options.status as Status | undefined,
          requirementId: options.requirement,
        });

        if (options.json) {
          console.log(JSON.stringify(specifications, null, 2));
          return;
        }

        if (specifications.length === 0) {
          console.log(chalk.gray("No specifications found."));
          return;
        }

        const table = new Table({
          head: ["ID", "Requirement", "Status", "Version"],
          style: { head: ["cyan"] },
        });

        for (const spec of specifications) {
          const statusColor =
            STATUS_COLORS[spec.status] ?? identityColor;

          table.push([
            spec.id,
            spec.requirementId,
            statusColor(spec.status),
            spec.version,
          ]);
        }

        console.log(table.toString());
        console.log(
          chalk.gray(`\n${specifications.length} specification(s) found.`),
        );
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
