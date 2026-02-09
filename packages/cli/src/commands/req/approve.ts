import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR, REQUIREMENTS_DIR } from "@reqord/shared";
import { showRequirement } from "../../services/requirement-service.js";
import {
  startApproval,
  type ApprovalTarget,
} from "../../services/approval-service.js";

export const approveCommand = new Command("approve")
  .description("Start approval flow for a requirement via GitHub PR")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("--dry-run", "Show what would be done without making changes")
  .action(async (id: string, options: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    try {
      const { requirement } = await showRequirement(cwd, id);

      const target: ApprovalTarget = {
        type: "requirement",
        id: requirement.id,
        version: requirement.version,
        status: requirement.status,
        title: requirement.title,
        jsonPath: `${REQORD_DIR}/${REQUIREMENTS_DIR}/${requirement.id}.json`,
      };

      const result = await startApproval(cwd, target, {
        dryRun: options.dryRun,
      });

      if (options.dryRun) {
        return;
      }

      console.log(chalk.green(`Approval PR created for ${id}`));
      console.log(`  Branch: ${result.branchName}`);
      console.log(`  PR: ${result.prUrl}`);
    } catch (error) {
      console.error(
        chalk.red(`Failed to start approval: ${(error as Error).message}`)
      );
      process.exitCode = 1;
    }
  });
