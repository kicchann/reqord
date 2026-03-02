import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, REQUIREMENTS_DIR } from "@reqord/shared";
import {
  showRequirement,
  checkReqApprovalPrerequisites,
} from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalTarget,
} from "../../services/approval-service.js";
import { requirementHandler, buildReqApprovalPrBody } from "../../services/requirement-approval-handler.js";
import { handleError } from "../../utils/error-handler.js";
import { findUnresolvedByArtifactId } from "../../repositories/feedback.js";
import { loadProjectSettings } from "../../services/project-settings-service.js";
import { shouldBlockApproval } from "../../services/feedback-validation.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const approveCommand = new Command("approve")
  .description("Create an approval request PR for a requirement (approval is confirmed when the PR is merged)")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (id: string, options: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    try {
      // 1. Load project settings
      const settings = await loadProjectSettings(cwd);

      // 2. Load requirement
      const { requirement } = await showRequirement(cwd, id);

      // 3. Check prerequisites
      const prereqs = await checkReqApprovalPrerequisites(cwd, id, settings);
      if (!prereqs.ok) {
        for (const error of prereqs.errors) {
          console.error(chalk.red(`Error: ${error}`));
        }
        console.error(chalk.yellow(`Please resolve the issues first.`));
        process.exitCode = 1;
        return;
      }

      // Feedback warning (or block) before approval
      const unresolvedFeedbacks = await findUnresolvedByArtifactId(cwd, id);
      if (unresolvedFeedbacks.length > 0) {
        const { blocked, blockingFeedbacks } = shouldBlockApproval(unresolvedFeedbacks, settings);

        if (blocked) {
          console.error(
            chalk.red(
              `Error: ${requirement.id} has ${blockingFeedbacks.length} unresolved feedback(s) that meet or exceed the severity threshold (${settings.feedbackValidation.severityThreshold}):`,
            ),
          );
          for (const fb of blockingFeedbacks) {
            console.error(
              chalk.red(
                `  - #${fb.githubIssue} (${fb.type ?? "unclassified"}, severity: ${fb.severity ?? "low"})`,
              ),
            );
          }
          throw new AppError(
            `Approval blocked: ${blockingFeedbacks.length} unresolved feedback(s) at or above severity threshold "${settings.feedbackValidation.severityThreshold}". Resolve them or set feedbackValidation.blockOnUnresolved to false in setting.yaml.`,
            ErrorCode.VALIDATION_ERROR,
          );
        } else {
          console.log(
            chalk.yellow(
              `⚠ Warning: ${requirement.id} has ${unresolvedFeedbacks.length} unresolved feedback(s):`,
            ),
          );
          for (const fb of unresolvedFeedbacks) {
            console.log(
              chalk.yellow(
                `  - #${fb.githubIssue} (${fb.type ?? "unclassified"}, severity: ${fb.severity ?? "low"})`,
              ),
            );
          }
          console.log(chalk.yellow("Proceeding with approval..."));
          console.log();
        }
      }

      const target: ApprovalTarget = {
        type: "requirement",
        id: requirement.id,
        version: requirement.version,
        status: requirement.status,
        title: requirement.title,
        files: [`${REQORD_DIR}/${REQUIREMENTS_DIR}/${requirement.id}.yaml`],
      };

      // Build custom handler with enriched PR body
      const customHandler = {
        ...requirementHandler,
        buildPrBody: (t: ApprovalTarget) =>
          buildReqApprovalPrBody({
            id: t.id,
            title: t.title,
            version: t.version,
            successCriteria: requirement.successCriteria,
            dependencies: requirement.dependencies,
          }),
      };

      const result = await startApproval(cwd, target, customHandler, settings, {
        dryRun: options.dryRun,
      });

      if (options.dryRun) {
        return;
      }

      if (result.prUrl) {
        console.log(chalk.green(`Approval PR created: ${id}`));
        console.log(`Approval will be confirmed when the PR is merged`);
        console.log(`  Branch: ${result.branchName}`);
        console.log(`  PR: ${result.prUrl}`);
      } else {
        console.log(chalk.green(`Approved: ${id} (direct commit)`));
      }
    } catch (error) {
      handleError(error);
    }
  });
