import { Command } from "commander";
import chalk from "chalk";
import {
  updateSpecification,
  showSpecification,
  type UpdateSpecOptions,
} from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const draftCommand = new Command("draft")
  .description("Revert a specification to draft status")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--major", "Force major version increment (X.0)")
  .option("--patch", "Force patch version increment (.Y)")
  .option("--json", "Output result as JSON")
  .action(
    async (
      id: string,
      options: {
        major?: boolean;
        patch?: boolean;
        json?: boolean;
      },
    ) => {
      const cwd = process.cwd();

      try {
        // Check for mutually exclusive version bump options
        const versionBumpCount = [options.major, options.patch].filter(Boolean).length;
        if (versionBumpCount > 1) {
          throw new AppError(
            "Only one of --major or --patch can be specified.",
            ErrorCode.INVALID_ARGUMENT,
          );
        }

        // Show current specification and flags
        const { specification } = await showSpecification(cwd, id);

        // Display flag status before reversion
        if (specification.flags.length > 0 && !options.json) {
          console.log(
            chalk.yellow(
              `⚠ Warning: ${specification.id} has ${specification.flags.length} unresolved feedback flag(s):`,
            ),
          );
          for (const flag of specification.flags) {
            console.log(
              chalk.yellow(
                `  - ${flag.type}: ${flag.reason} (${flag.severity})`,
              ),
            );
          }
          console.log(chalk.yellow("Proceeding with reversion to draft..."));
          console.log();
        }

        const updateOpts: UpdateSpecOptions = {
          status: "draft",
        };

        // Version bump override
        if (options.major) updateOpts.versionBump = "major";
        if (options.patch) updateOpts.versionBump = "patch";

        const { before, after } = await updateSpecification(cwd, id, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Reverted specification to draft: ${id}`));
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
