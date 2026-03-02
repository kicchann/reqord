import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, SPECIFICATIONS_DIR } from "@reqord/shared";
import {
  updateSpecification,
  showSpecification,
  type UpdateSpecOptions,
} from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { loadProjectSettings } from "../../services/project-settings-service.js";
import {
  executeStatusTransition,
  type StatusTransitionTarget,
  type StatusTransitionCallbacks,
} from "../../services/status-transition-service.js";

export const implementCommand = new Command("implement")
  .description("Mark a specification as implemented")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
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
        // Show current specification
        const { specification } = await showSpecification(cwd, id);

        // Precondition: status must be "approved"
        if (specification.status !== "approved") {
          throw new AppError(
            `Specification status is not "approved" (current: ${specification.status})`,
            ErrorCode.VALIDATION_ERROR,
          );
        }

        const settings = await loadProjectSettings(cwd);

        if (settings.statusTransitionPr.approvedToImplemented) {
          // PR flow via executeStatusTransition
          const target: StatusTransitionTarget = {
            id: specification.id,
            version: specification.version,
            files: [`${REQORD_DIR}/${SPECIFICATIONS_DIR}/${specification.id}.yaml`],
          };

          const callbacks: StatusTransitionCallbacks = {
            updateStatus: async (cwdArg: string) => {
              const updateOpts: UpdateSpecOptions = { status: "implemented" };
              const { after } = await updateSpecification(cwdArg, id, updateOpts);
              return after.version;
            },
            buildBranchName: (t, s) =>
              `${s.branchNaming.toImplementedPrefix}/${t.id}-implement-v${t.version}`,
            buildPrTitle: (t) => `[Reqord] Implement ${t.id}`,
            buildPrBody: (t) =>
              `## Specification Implementation\n\n| Field | Value |\n|-----------|------|\n| ID | ${t.id} |\n| Version | ${t.version} |\n\n### Changes\nstatus: approved → implemented`,
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
            console.log(chalk.green(`Marked specification as implemented: ${id}`));
            if (result.prUrl) {
              console.log(`  PR: ${result.prUrl}`);
            }
          }
        } else {
          // Direct update (default behavior)
          const updateOpts: UpdateSpecOptions = {
            status: "implemented",
          };

          const { before, after } = await updateSpecification(cwd, id, updateOpts);

          if (options.json) {
            console.log(JSON.stringify(after, null, 2));
            return;
          }

          console.log(chalk.green(`Marked specification as implemented: ${id}`));
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
