import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, REQUIREMENTS_DIR } from "@reqord/shared";
import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalTarget,
} from "../../services/approval-service.js";
import { requirementHandler, buildReqApprovalPrBody } from "../../services/requirement-approval-handler.js";
import { handleError } from "../../utils/error-handler.js";

export const approveCommand = new Command("approve")
  .description("Create an approval request PR for a requirement (approval is confirmed when the PR is merged)")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (id: string, options: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    try {
      const { requirement } = await showRequirement(cwd, id);

      // v2.0.0: Flag warning before approval
      if (requirement.flags.length > 0) {
        console.log(
          chalk.yellow(
            `⚠ Warning: ${requirement.id} has ${requirement.flags.length} unresolved feedback flag(s):`,
          ),
        );
        for (const flag of requirement.flags) {
          console.log(
            chalk.yellow(
              `  - ${flag.type}: ${flag.reason}${"severity" in flag ? ` (${flag.severity})` : ""}`,
            ),
          );
        }
        console.log(chalk.yellow("Proceeding with approval..."));
        console.log();
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

      const result = await startApproval(cwd, target, customHandler, {
        dryRun: options.dryRun,
      });

      if (options.dryRun) {
        return;
      }

      console.log(chalk.green(`Approval PR created: ${id}`));
      console.log(`Approval will be confirmed when the PR is merged`);
      console.log(`  Branch: ${result.branchName}`);
      console.log(`  PR: ${result.prUrl}`);
    } catch (error) {
      handleError(error);
    }
  });
