import { Command } from "commander";
import chalk from "chalk";
import { migrateToYaml } from "../services/migration-service.js";
import { handleError } from "../utils/error-handler.js";

export const migrateToYamlCommand = new Command("migrate-to-yaml")
  .description("Migrate all JSON files to YAML format in .reqord/")
  .option("--dry-run", "Preview migration without making changes")
  .action(async (options: { dryRun?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await migrateToYaml(cwd, {
        dryRun: options.dryRun ?? false,
      });

      if (options.dryRun) {
        console.log(chalk.yellow("プレビューモード（実際の変換は行いません）"));
        console.log("");
        console.log(chalk.bold("変換対象ファイル:"));
        result.plan.forEach((item) => {
          console.log(`  ${item.source} → ${item.destination}`);
        });
        console.log("");
        console.log(chalk.gray(`合計: ${result.plan.length}ファイル`));
        return;
      }

      console.log(chalk.green("YAML移行が完了しました"));
      console.log(`  変換成功: ${result.success.length}ファイル`);
      if (result.errors.length > 0) {
        console.log(chalk.red(`  変換失敗: ${result.errors.length}ファイル`));
        result.errors.forEach((err) => {
          console.log(chalk.red(`    - ${err.file}: ${err.reason}`));
        });
      }
      console.log("");
      console.log(chalk.gray("バックアップ: .reqord/.backup/ に移動済み"));
    } catch (error) {
      handleError(error);
    }
  });
