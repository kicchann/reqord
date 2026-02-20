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
        if (result.plan.length === 0) {
          console.log(chalk.gray("No JSON files found for migration."));
          return;
        }
        console.log(chalk.yellow("Preview mode (no actual conversion will be performed)"));
        console.log("");
        console.log(chalk.bold("Files to convert:"));
        result.plan.forEach((item) => {
          console.log(`  ${item.source} → ${item.destination}`);
        });
        console.log("");
        console.log(chalk.gray(`Total: ${result.plan.length} file(s)`));
        return;
      }

      if (result.plan.length === 0) {
        console.log(chalk.gray("No JSON files found for migration."));
        return;
      }

      if (result.errors.length > 0) {
        console.log(chalk.yellow("YAML migration completed (with some errors)"));
      } else {
        console.log(chalk.green("YAML migration completed"));
      }
      console.log(`  Converted successfully: ${result.success.length} file(s)`);
      if (result.errors.length > 0) {
        console.log(chalk.red(`  Conversion failed: ${result.errors.length} file(s)`));
        result.errors.forEach((err) => {
          console.log(chalk.red(`    - ${err.file}: ${err.reason}`));
        });
      }
      console.log("");
      console.log(chalk.gray("Backup: moved to .reqord/.backup/"));
    } catch (error) {
      handleError(error);
    }
  });
