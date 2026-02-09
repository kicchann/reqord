import { Command } from "commander";
import chalk from "chalk";
import {
  linkToRequirement,
  linkWithNewRequirement,
  linkToSpecification,
} from "../../services/feedback-service.js";
import type { FeedbackType, FeedbackSeverity } from "@reqord/shared";

export const feedbackLinkCommand = new Command("link")
  .description("Link feedback to requirement or specification")
  .argument("<issue-number>", "GitHub issue number")
  .option("--req <id>", "Link to existing requirement")
  .option("--created-req", "Create new requirement from feedback")
  .option("--spec <id>", "Link to specification")
  .option("--type <type>", "Feedback type (bug|improvement|requirement-gap|spec-mismatch|security)")
  .option("--severity <level>", "Severity (critical|high|medium|low)")
  .action(async (issueNumberStr: string, options: {
    req?: string;
    createdReq?: boolean;
    spec?: string;
    type?: string;
    severity?: string;
  }) => {
    try {
      const cwd = process.cwd();
      const issueNumber = parseInt(issueNumberStr, 10);

      if (isNaN(issueNumber)) {
        throw new Error("Invalid issue number");
      }

      // Mutual exclusion check
      const modes = [options.req, options.createdReq, options.spec].filter(Boolean);
      if (modes.length !== 1) {
        throw new Error("Specify exactly one of --req, --created-req, or --spec");
      }

      if (options.req) {
        await linkToRequirement(cwd, {
          issueNumber,
          requirementId: options.req,
          type: options.type as FeedbackType | undefined,
          severity: options.severity as FeedbackSeverity | undefined,
        });
        console.log(chalk.green(`✓ Linked Feedback #${issueNumber} to ${options.req}`));
        console.log(chalk.gray(`  Added feedback-review flag to ${options.req}`));
      } else if (options.createdReq) {
        const newId = await linkWithNewRequirement(cwd, {
          issueNumber,
          type: options.type as FeedbackType | undefined,
          severity: options.severity as FeedbackSeverity | undefined,
        });
        console.log(chalk.green(`✓ Created ${newId} from Feedback #${issueNumber}`));
      } else if (options.spec) {
        await linkToSpecification(cwd, {
          issueNumber,
          specificationId: options.spec,
          type: options.type as FeedbackType | undefined,
          severity: options.severity as FeedbackSeverity | undefined,
        });
        console.log(chalk.green(`✓ Linked Feedback #${issueNumber} to ${options.spec}`));
        console.log(chalk.gray(`  Added feedback-review flag to ${options.spec}`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
