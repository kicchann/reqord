import { Command } from "commander";
import chalk from "chalk";
import { initContext } from "../../services/context-service.js";
import { handleError } from "../../utils/error-handler.js";

export const contextInitCommand = new Command("init")
  .description("Initialize project context")
  .argument("<name>", "Project name")
  .option("-l, --language <lang>", "Language (default: ja)", "ja")
  .action(async (name: string, options: { language: string }) => {
    const cwd = process.cwd();

    try {
      const id = name.toLowerCase().replace(/\s+/g, "-");
      const context = await initContext(cwd, {
        id,
        name,
        language: options.language,
      });

      console.log(chalk.green(`Initialized project context: ${context.name}`));
      console.log("");
      console.log(`  ID:       ${context.id}`);
      console.log(`  Name:     ${context.name}`);
      console.log(`  Version:  ${context.version}`);
      console.log(`  Language: ${context.language}`);
      console.log("");
      console.log(chalk.gray("Generated files:"));
      console.log(chalk.gray("  context/context.json"));
      console.log(chalk.gray("  context/product.json"));
      console.log(chalk.gray("  context/technical.json"));
      console.log(chalk.gray("  context/structure.json"));
      console.log(chalk.gray("  context/domain/"));
      console.log("");
      console.log(
        chalk.gray("Next: Edit context files to describe your project."),
      );
    } catch (error) {
      handleError(error);
    }
  });
