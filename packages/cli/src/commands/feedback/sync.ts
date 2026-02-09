import { Command } from "commander";
import chalk from "chalk";
import { syncFromGitHub, syncToGitHub } from "../../services/feedback-sync-service.js";

export const syncCommand = new Command("sync")
  .description("Sync GitHub Issues with feedback label to index.json")
  .option("--from-local", "Sync from index.json to GitHub")
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
          ? "index.json → GitHub"
          : "GitHub → index.json";
        console.log(chalk.green(`✓ Synced ${count} feedbacks (${direction})`));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  });
