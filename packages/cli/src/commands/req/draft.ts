import { Command } from "commander";
import chalk from "chalk";
import {
  updateRequirement,
  showRequirement,
  type UpdateOptions,
} from "../../services/requirement-service.js";
import { revertToDraft } from "../../services/draft-reversion-service.js";
import { handleError } from "../../utils/error-handler.js";
import { findUnresolvedByArtifactId } from "../../repositories/feedback.js";

export const draftCommand = new Command("draft")
  .description("Revert a requirement to draft status")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--dry-run", "Show what would happen without making changes")
  .option("--major", "Force major version increment (deprecated)")
  .option("--patch", "Force minor version increment (deprecated)")
  .option("--json", "Output result as JSON")
  .action(
    async (
      id: string,
      options: {
        dryRun?: boolean;
        major?: boolean;
        patch?: boolean;
        json?: boolean;
      },
    ) => {
      const cwd = process.cwd();

      try {
        // Show deprecation warning for --major/--patch
        if ((options.major || options.patch) && !options.json) {
          console.error(
            chalk.yellow(
              "Warning: --major/--patch options are deprecated. Use 'reqord version <id> --major/--patch' instead.",
            ),
          );
        }
        // Show current requirement and flags
        const { requirement } = await showRequirement(cwd, id);

        // Display feedback status before reversion
        const unresolvedFeedbacks = await findUnresolvedByArtifactId(cwd, id);
        if (unresolvedFeedbacks.length > 0 && !options.json) {
          console.log(
            chalk.yellow(
              `⚠ Warning: ${requirement.id} has ${unresolvedFeedbacks.length} unresolved feedback(s):`,
            ),
          );
          for (const fb of unresolvedFeedbacks) {
            console.log(
              chalk.yellow(
                `  - #${fb.githubIssue}: Feedback from issue #${fb.githubIssue} (severity: ${fb.severity ?? "medium"})`,
              ),
            );
          }
          console.log(chalk.yellow("Proceeding with reversion to draft..."));
          console.log();
        }

        // approved/implemented → draft: use DraftReversionService (PR flow)
        if (requirement.status === "approved" || requirement.status === "implemented") {
          const result = await revertToDraft(cwd, id, { dryRun: options.dryRun });

          if (options.json) {
            console.log(JSON.stringify(result, null, 2));
            return;
          }

          if (options.dryRun) {
            console.log(`[dry-run] Status change: ${result.previousStatus} → draft`);
            if (result.impactedRequirements.length > 0) {
              console.log(`[dry-run] Impact scope:`);
              for (const rid of result.impactedRequirements) {
                console.log(`  - ${rid}`);
              }
            }
          } else {
            console.log(chalk.green(`Reversion PR created: ${id}`));
            console.log(`  status: ${result.previousStatus} → draft (confirmed when PR is merged)`);
            if (result.impactedRequirements.length > 0) {
              console.log();
              console.log("Impact scope:");
              for (const rid of result.impactedRequirements) {
                console.log(`  - ${rid}`);
              }
            }
            console.log();
            console.log(`PR created: ${result.prUrl}`);
            console.log("Reversion will be confirmed when the PR is merged.");
          }
          return;
        }

        // flagged → draft: use existing updateRequirement (no PR needed)
        const updateOpts: UpdateOptions = {
          status: "draft",
        };

        // Pass version bump if specified (deprecated, but maintain behavior)
        if (options.major) updateOpts.versionBump = "major";
        if (options.patch) updateOpts.versionBump = "patch";

        const { before, after } = await updateRequirement(cwd, id, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Reverted requirement to draft: ${id}`));
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
