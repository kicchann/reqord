import { Command } from "commander";
import chalk from "chalk";
import {
  updateRequirement,
  showRequirement,
  type UpdateOptions,
} from "../../services/requirement-service.js";
import { listSpecifications } from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";

export const implementCommand = new Command("implement")
  .description("Mark a requirement as implemented")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
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
        // Validate requirement exists
        const { requirement } = await showRequirement(cwd, id);

        // Precondition: status must be "approved"
        if (requirement.status !== "approved") {
          console.error(chalk.red(`エラー: Requirementのステータスが approved ではありません（現在: ${requirement.status}）`));
          process.exitCode = 1;
          return;
        }

        // Show related specifications
        const specs = await listSpecifications(cwd, { requirementId: id });
        if (specs.length > 0 && !options.json) {
          console.log(chalk.cyan(`Related specifications (${specs.length}):`));
          for (const spec of specs) {
            console.log(`  - ${spec.id}: ${spec.status} (v${spec.version})`);
          }
          console.log();
        }

        const updateOpts: UpdateOptions = {
          status: "implemented",
        };

        const { before, after } = await updateRequirement(cwd, id, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Marked requirement as implemented: ${id}`));
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
