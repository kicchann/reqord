import { Command } from "commander";
import chalk from "chalk";
import { syncFromGitHub, syncToGitHub } from "../../services/feedback-sync-service.js";
import { handleError } from "../../utils/error-handler.js";

export const syncCommand = new Command("sync")
  .description("Sync GitHub Issues with feedback label to index.yaml")
  .option("--from-local", "Sync from index.yaml to GitHub")
  .option("--json", "Output as JSON")
  .action(async (options: { fromLocal?: boolean; json?: boolean }) => {
    try {
      const cwd = process.cwd();
      const count = options.fromLocal
        ? await syncToGitHub(cwd)
        : await syncFromGitHub(cwd);

      if (options.json) {
        console.log(JSON.stringify({ synced: count }));
      } else {
        const direction = options.fromLocal
          ? "index.yaml → GitHub"
          : "GitHub → index.yaml";
        console.log(chalk.green(`✓ Synced ${count} feedbacks (${direction})`));
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
