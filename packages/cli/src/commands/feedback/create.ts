import { Command } from "commander";
import chalk from "chalk";
import { createFeedbackIssue } from "../../services/feedback-service.js";
import type { FeedbackType, FeedbackSeverity } from "@reqord/shared";
import { handleError } from "../../utils/error-handler.js";

export const feedbackCreateCommand = new Command("create")
  .description("Create a new feedback GitHub Issue (follows ISSUE_TEMPLATE/05-feedback.yml)")
  .requiredOption("--title <title>", "Issue title (auto-prefixed with [Feedback])")
  .requiredOption("--description <text>", "What happened / what did you notice?")
  .option("--type <type>", "Feedback type (bug|improvement|requirement-gap|spec-mismatch|security)")
  .option("--severity <level>", "Severity (critical|high|medium|low)")
  .option("--related-req <id>", "Related requirement ID")
  .option("--related-spec <id>", "Related specification ID")
  .action(async (options: {
    title: string;
    description: string;
    type?: string;
    severity?: string;
    relatedReq?: string;
    relatedSpec?: string;
  }) => {
    try {
      const cwd = process.cwd();

      const issueNumber = await createFeedbackIssue(cwd, {
        title: options.title,
        description: options.description,
        type: options.type as FeedbackType | undefined,
        severity: options.severity as FeedbackSeverity | undefined,
        relatedReq: options.relatedReq,
        relatedSpec: options.relatedSpec,
      });

      console.log(chalk.green(`✓ Created Feedback Issue #${issueNumber}`));
      console.log(chalk.gray(`  Label: feedback, reqord-generated`));
      console.log(chalk.gray(`  Updated .reqord/feedback/index.yaml`));
    } catch (error) {
      handleError(error);
    }
  });
