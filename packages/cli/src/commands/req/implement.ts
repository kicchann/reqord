import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, REQUIREMENTS_DIR } from "@reqord/shared";
import {
  updateRequirement,
  showRequirement,
  type UpdateOptions,
} from "../../services/requirement-service.js";
import { listSpecifications } from "../../services/specification-service.js";
import { checkImplementConsistency } from "../../services/impl-validation-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { loadProjectSettings } from "../../services/project-settings-service.js";
import {
  executeStatusTransition,
  type StatusTransitionTarget,
  type StatusTransitionCallbacks,
} from "../../services/status-transition-service.js";

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
            `Requirement status is not "approved" (current: ${requirement.status})`,
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

        // Consistency check: warn or block if specs are not implemented or issues are open
        const settings = await loadProjectSettings(cwd);
        const consistencyResult = await checkImplementConsistency(cwd, id);
        if (consistencyResult.warnings.length > 0) {
          const specWarnings = consistencyResult.warnings.filter(w => w.type === "spec-not-implemented");

          if (settings.consistencyCheck.specNotImplementedLevel === "error" && specWarnings.length > 0) {
            if (!options.json) {
              console.error(chalk.red("\n✗ Consistency check errors:"));
              for (const w of specWarnings) {
                console.error(chalk.red(`  - ${w.message}`));
              }
            }
            throw new AppError(
              "未実装のspecificationがあります",
              ErrorCode.VALIDATION_ERROR,
            );
          } else if (!options.json) {
            console.warn(chalk.yellow("\n⚠ Consistency check warnings:"));
            for (const w of consistencyResult.warnings) {
              console.warn(chalk.yellow(`  - ${w.message}`));
            }
            console.warn("");
          }
        }

        if (settings.statusTransitionPr.approvedToImplemented) {
          // PR flow via executeStatusTransition
          const target: StatusTransitionTarget = {
            id: requirement.id,
            version: requirement.version,
            files: [`${REQORD_DIR}/${REQUIREMENTS_DIR}/${requirement.id}.yaml`],
          };

          const callbacks: StatusTransitionCallbacks = {
            updateStatus: async (cwdArg: string) => {
              const updateOpts: UpdateOptions = { status: "implemented" };
              const { after } = await updateRequirement(cwdArg, id, updateOpts);
              return after.version;
            },
            buildBranchName: (t, _s) =>
              `${_s.branchNaming.toImplementedPrefix}/${t.id}-implement-v${t.version}`,
            buildPrTitle: (t) => `[Reqord] Implement ${t.id}`,
            buildPrBody: (t) =>
              `## Requirement Implementation\n\n| Field | Value |\n|-----------|------|\n| ID | ${t.id} |\n| Version | ${t.version} |\n\n### Changes\nstatus: approved → implemented`,
            buildCommitMessage: (t) =>
              `chore(reqord): mark ${t.id} as implemented`,
          };

          const result = await executeStatusTransition(
            cwd,
            target,
            callbacks,
            true,
            settings,
          );

          if (options.json) {
            console.log(JSON.stringify({ id, status: "implemented", prUrl: result.prUrl, prNumber: result.prNumber }, null, 2));
          } else {
            console.log(chalk.green(`Marked requirement as implemented: ${id}`));
            if (result.prUrl) {
              console.log(`  PR: ${result.prUrl}`);
            }
          }
        } else {
          // Direct update (default behavior)
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
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
