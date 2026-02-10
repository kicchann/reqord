import { Command } from "commander";
import chalk from "chalk";
import * as fs from "../../repositories/file-system.js";
import { updateSpecDesign } from "../../services/specification-service.js";
import { handleError } from "../../utils/error-handler.js";

export const specDesignCommand = new Command("design")
  .description("View or update specification design document")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--content-file <path>", "Path to content file to update design")
  .action(async (id: string, options: { contentFile?: string }) => {
    const cwd = process.cwd();

    try {
      let content: string | undefined;
      if (options.contentFile) {
        content = await fs.readText(options.contentFile);
      }

      const result = await updateSpecDesign(cwd, id, { content });

      if (result.updated) {
        console.log(chalk.green(`Updated design for ${id}`));
      } else {
        console.log(`Design file: ${chalk.cyan(`.reqord/${result.filePath}`)}`);
        console.log(
          chalk.gray(
            "Use --content-file <path> to update, or edit the file directly.",
          ),
        );
      }
    } catch (error) {
      handleError(error);
    }
  });
