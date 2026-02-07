import { Command } from "commander";
import chalk from "chalk";
import { initProject } from "../services/init-service.js";

export const initCommand = new Command("init")
  .description("Initialize .reqord/ directory structure")
  .action(async () => {
    const cwd = process.cwd();

    try {
      const result = await initProject(cwd);

      if (result.alreadyExists) {
        console.error(
          chalk.red("Error: .reqord/ already exists in the current directory."),
        );
        console.error(
          chalk.yellow("Use --force to reinitialize (not yet implemented)."),
        );
        process.exitCode = 1;
        return;
      }

      console.log(chalk.green("Initialized .reqord/ directory structure:"));
      console.log("");
      console.log("  context/");
      console.log("  requirements/");
      console.log("  specifications/");
      console.log("  settings/");
      console.log("    templates/");
      console.log("    rules/");
      console.log("  assets/");
      console.log("");
      console.log(
        chalk.gray("Next: reqord req create <title> to create a requirement"),
      );
    } catch (error) {
      console.error(
        chalk.red(`Failed to initialize: ${(error as Error).message}`),
      );
      process.exitCode = 1;
    }
  });
