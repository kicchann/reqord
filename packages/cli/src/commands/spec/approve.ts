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
  buildSpecApprovalPrBody,
} from "../../services/spec-approval-helpers.js";
import { handleError } from "../../utils/error-handler.js";

export const specApproveCommand = new Command("approve")
  .description("Start approval flow for a specification via GitHub PR")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (id: string, options: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    try {
      // 1. Check prerequisites
      const prereqs = await checkSpecApprovalPrerequisites(cwd, id);
      if (!prereqs.ok) {
        for (const error of prereqs.errors) {
          console.error(chalk.red(`エラー: ${error}`));
        }
        console.error(chalk.yellow(`先に問題を解決してください。`));
        process.exitCode = 1;
        return;
      }

      // 2. Load spec and requirement
      const { specification, design } = await showSpecification(cwd, id);
      const { requirement } = await showRequirement(cwd, specification.requirementId);

      // v2.0.0: Flag warning before approval
      if (specification.flags.length > 0) {
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
        console.log(chalk.yellow("Proceeding with approval..."));
        console.log();
      }

      // 3. Build custom handler with actual design content
      const designSummary = extractDesignSummary(design ?? "");
      const customHandler = {
        ...specificationHandler,
        buildPrBody: (target: ApprovalTarget) =>
          buildSpecApprovalPrBody({
            specId: target.id,
            reqId: requirement.id,
            reqTitle: requirement.title,
            version: target.version,
            designSummary,
          }),
      };

      // 4. Build target
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

      // 5. Start approval
      const result = await startApproval(cwd, target, customHandler, {
        dryRun: options.dryRun,
      });

      if (options.dryRun) {
        return;
      }

      console.log(chalk.green(`Approval PR created for ${id}`));
      console.log(`  Branch: ${result.branchName}`);
      console.log(`  PR: ${result.prUrl}`);
    } catch (error) {
      handleError(error);
    }
  });
