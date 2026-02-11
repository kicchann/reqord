import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import { listFeedbacks } from "../../services/feedback-service.js";
import type { FeedbackType } from "@reqord/shared";
import { handleError } from "../../utils/error-handler.js";
import { FEEDBACK_STATUS_COLORS, identityColor } from "../../utils/display.js";

export const feedbackListCommand = new Command("list")
  .description("List feedback issues from index.yaml")
  .option("--state <state>", "Filter by state (open|closed|all)", "all")
  .option("--type <type>", "Filter by type")
  .option("--json", "Output as JSON")
  .action(async (options: { state?: string; type?: string; json?: boolean }) => {
    try {
      const cwd = process.cwd();
      const feedbacks = await listFeedbacks(cwd, {
        state: options.state as "open" | "closed" | "all" | undefined,
        type: options.type as FeedbackType | undefined,
      });

      if (options.json) {
        console.log(JSON.stringify(feedbacks, null, 2));
        return;
      }

      if (feedbacks.length === 0) {
        console.log(chalk.gray("No feedbacks found. Run 'reqord feedback sync' first."));
        return;
      }

      const table = new Table({
        head: ["Issue", "Status", "Type", "Severity", "Requirements", "Specs"],
        style: { head: ["cyan"] },
      });

      for (const f of feedbacks) {
        const statusColor = FEEDBACK_STATUS_COLORS[f.status] ?? identityColor;
        table.push([
          `#${f.githubIssue}`,
          statusColor(f.status),
          f.type ?? "-",
          f.severity ?? "-",
          f.linkedTo.requirements.join(", ") || "-",
          f.linkedTo.specifications.join(", ") || "-",
        ]);
      }

      console.log(table.toString());
      console.log(chalk.gray(`\n${feedbacks.length} feedback(s) found.`));
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
