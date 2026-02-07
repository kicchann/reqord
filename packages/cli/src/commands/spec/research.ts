import { Command } from "commander";
import chalk from "chalk";
import { readFile } from "node:fs/promises";
import { updateSpecResearch } from "../../services/specification-service.js";

export const specResearchCommand = new Command("research")
  .description("View or update specification research document")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--content-file <path>", "Path to content file to update research")
  .action(async (id: string, options: { contentFile?: string }) => {
    const cwd = process.cwd();

    try {
      let content: string | undefined;
      if (options.contentFile) {
        content = await readFile(options.contentFile, "utf-8");
      }

      const result = await updateSpecResearch(cwd, id, { content });

      if (result.updated) {
        console.log(chalk.green(`Updated research for ${id}`));
      } else {
        console.log(`Research file: ${chalk.cyan(`.reqord/${result.filePath}`)}`);
        console.log(
          chalk.gray(
            "Use --content-file <path> to update, or edit the file directly.",
          ),
        );
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to update research: ${(error as Error).message}`,
        ),
      );
      process.exitCode = 1;
    }
  });
