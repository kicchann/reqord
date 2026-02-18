import { Command } from "commander";
import chalk from "chalk";
import {
  updateRequirement,
  showRequirement,
  type UpdateOptions,
} from "../../services/requirement-service.js";
import { listSpecifications } from "../../services/specification-service.js";
import { checkImplementConsistency } from "../../services/impl-validation-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

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
          throw new AppError(
            `Requirementのステータスが approved ではありません（現在: ${requirement.status}）`,
            ErrorCode.VALIDATION_ERROR,
          );
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

        // Consistency check: warn if specs are not implemented or issues are open
        const consistencyResult = await checkImplementConsistency(cwd, id);
        if (consistencyResult.warnings.length > 0 && !options.json) {
          console.warn(chalk.yellow("\n⚠ 整合性チェック警告:"));
          for (const w of consistencyResult.warnings) {
            console.warn(chalk.yellow(`  - ${w.message}`));
          }
          console.warn("");
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
