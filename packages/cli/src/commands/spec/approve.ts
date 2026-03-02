import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, SPECIFICATIONS_DIR } from "@reqord/shared";
import {
  showSpecification,
  checkSpecApprovalPrerequisites,
} from "../../services/specification-service.js";
import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalTarget,
} from "../../services/approval-service.js";
import { specificationHandler } from "../../services/specification-approval-handler.js";
import {
  extractDesignSummary,
  extractDesignSection,
  extractComponentList,
  buildSpecApprovalPrBody,
} from "../../services/spec-approval-helpers.js";
import { handleError } from "../../utils/error-handler.js";
import { findUnresolvedByArtifactId } from "../../repositories/feedback.js";
import { loadProjectSettings } from "../../services/project-settings-service.js";
import { shouldBlockApproval } from "../../services/feedback-validation.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const specApproveCommand = new Command("approve")
  .description("Create an approval request PR for a specification (approval is confirmed when the PR is merged)")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (id: string, options: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    try {
      // 1. Load project settings
      const settings = await loadProjectSettings(cwd);

      // 2. Load spec and check for existing approval PR first
      const { specification, design } = await showSpecification(cwd, id);

      // 3. Check prerequisites
      const prereqs = await checkSpecApprovalPrerequisites(cwd, id, settings);
      if (!prereqs.ok) {
        for (const error of prereqs.errors) {
          console.error(chalk.red(`Error: ${error}`));
        }
        console.error(chalk.yellow(`Please resolve the issues first.`));
        process.exitCode = 1;
        return;
      }

      const { requirement } = await showRequirement(cwd, specification.requirementId);

      // Feedback warning (or block) before approval
      const unresolvedFeedbacks = await findUnresolvedByArtifactId(cwd, id);
      if (unresolvedFeedbacks.length > 0) {
        const { blocked, blockingFeedbacks } = shouldBlockApproval(unresolvedFeedbacks, settings);

        if (blocked) {
          console.error(
            chalk.red(
              `Error: ${specification.id} has ${blockingFeedbacks.length} unresolved feedback(s) that meet or exceed the severity threshold (${settings.feedbackValidation.severityThreshold}):`,
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
              `⚠ Warning: ${specification.id} has ${unresolvedFeedbacks.length} unresolved feedback(s):`,
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

      // 4. Build custom handler with actual design content
      const designContent = design ?? "";
      const designSummary = extractDesignSummary(designContent);
      const testPlan = extractDesignSection(designContent, "Test Plan")
        ?? extractDesignSection(designContent, "テスト方針");
      const components = extractComponentList(designContent);
      const customHandler = {
        ...specificationHandler,
        buildPrBody: (target: ApprovalTarget) =>
          buildSpecApprovalPrBody({
            specId: target.id,
            reqId: requirement.id,
            reqTitle: requirement.title,
            version: target.version,
            designSummary,
            successCriteria: requirement.successCriteria,
            testPlan: testPlan || undefined,
            components: components.length > 0 ? components : undefined,
          }),
      };

      // 5. Build target
      const target: ApprovalTarget = {
        type: "specification",
        id: specification.id,
        version: specification.version,
        status: specification.status,
        title: `Specification ${specification.id} (${requirement.title})`,
        files: [
          `${REQORD_DIR}/${SPECIFICATIONS_DIR}/${specification.id}.yaml`,
          `${REQORD_DIR}/${SPECIFICATIONS_DIR}/${specification.id}/design.md`,
        ],
      };

      // 6. Start approval
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
