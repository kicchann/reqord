import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, REQUIREMENTS_DIR } from "@reqord/shared";
import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalTarget,
} from "../../services/approval-service.js";
import { requirementHandler } from "../../services/requirement-approval-handler.js";
import { handleError } from "../../utils/error-handler.js";

export const approveCommand = new Command("approve")
  .description("Start approval flow for a requirement via GitHub PR")
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
              `  - ${flag.type}: ${flag.reason} (${flag.severity})`,
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

      const result = await startApproval(cwd, target, requirementHandler, {
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
