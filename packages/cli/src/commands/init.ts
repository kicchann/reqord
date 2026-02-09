import { Command } from "commander";
import chalk from "chalk";
import { initProject } from "../services/init-service.js";
import { handleError } from "../utils/error-handler.js";
import { AppError, ErrorCode } from "../utils/errors.js";

export const initCommand = new Command("init")
  .description("Initialize .reqord/ directory structure")
  .action(async () => {
    const cwd = process.cwd();

    try {
      const result = await initProject(cwd);

      if (result.alreadyExists) {
        throw new AppError(
          ".reqord/ already exists in the current directory.",
          ErrorCode.ALREADY_EXISTS,
        );
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
      handleError(error);
    }
  });
