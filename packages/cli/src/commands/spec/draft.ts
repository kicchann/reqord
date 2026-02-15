import { Command } from "commander";
import chalk from "chalk";
import {
  updateSpecification,
  showSpecification,
  type UpdateSpecOptions,
} from "../../services/specification-service.js";
import { revertToDraft } from "../../services/draft-reversion-service.js";
import { handleError } from "../../utils/error-handler.js";

export const draftCommand = new Command("draft")
  .description("Revert a specification to draft status")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--dry-run", "Show what would happen without making changes")
  .option("--json", "Output result as JSON")
  .action(
    async (
      id: string,
      options: {
        dryRun?: boolean;
        json?: boolean;
      },
    ) => {
      const cwd = process.cwd();

      try {
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

        // approved/implemented → draft: use DraftReversionService (PR flow)
        if (specification.status === "approved" || specification.status === "implemented") {
          const result = await revertToDraft(cwd, id, { dryRun: options.dryRun });

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          if (options.dryRun) {
            console.log(`[dry-run] ステータス変更: ${result.previousStatus} → draft`);
            if (result.impactedRequirements.length > 0) {
              console.log(`[dry-run] 影響範囲:`);
              for (const rid of result.impactedRequirements) {
                console.log(`  - ${rid}`);
              }
            }
          } else {
            console.log(chalk.green(`差し戻しPRを作成しました: ${id}`));
            console.log(`  status: ${result.previousStatus} → draft (PRマージ後に確定)`);
            if (result.impactedRequirements.length > 0) {
              console.log();
              console.log("影響範囲:");
              for (const rid of result.impactedRequirements) {
                console.log(`  - ${rid}`);
              }
            }
            console.log();
            console.log(`PRを作成しました: ${result.prUrl}`);
            console.log("PRマージで差し戻しが確定します。");
          }
          return;
        }

        // flagged → draft: use existing updateSpecification (no PR needed)
        const updateOpts: UpdateSpecOptions = {
          status: "draft",
        };

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
