import { Command } from "commander";
import chalk from "chalk";
import { REQORD_DIR } from "@reqord/shared";
import { showContext, resolveFilePath } from "../../services/context-service.js";
import * as fs from "../../repositories/file-system.js";

export const contextShowCommand = new Command("show")
  .description("Show project context summary")
  .option("--json", "Output as JSON")
  .option("--detail", "Show file contents")
  .action(async (options: { json?: boolean; detail?: boolean }) => {
    const cwd = process.cwd();

    try {
      const result = await showContext(cwd);
      const ctx = result.context;

      if (options.json) {
        const jsonOutput: Record<string, unknown> = {
          context: result.context,
          product: result.product ?? null,
          technical: result.technical ?? null,
          structure: result.structure ?? null,
          domainFiles: result.domainFiles,
        };
        console.log(JSON.stringify(jsonOutput, null, 2));
        return;
      }

      console.log(chalk.cyan(`Project: ${ctx.name}`));
      console.log("");
      console.log(`  ID:       ${ctx.id}`);
      console.log(`  Version:  ${ctx.version}`);
      console.log(`  Language: ${ctx.language}`);
      console.log("");

      console.log(chalk.cyan("Files:"));
      console.log(
        `  product:    ${result.productExists ? chalk.green("exists") : chalk.red("missing")}`,
      );
      console.log(
        `  technical:  ${result.technicalExists ? chalk.green("exists") : chalk.red("missing")}`,
      );
      console.log(
        `  structure:  ${result.structureExists ? chalk.green("exists") : chalk.red("missing")}`,
      );
      console.log(
        `  domain:     ${result.domainFiles.length} file(s)`,
      );
      if (result.domainFiles.length > 0) {
        for (const file of result.domainFiles) {
          console.log(chalk.gray(`    - ${file}`));
        }
      }

      if (options.detail) {
        console.log("");
        await showFileDetail(cwd, "product", result.productExists, ctx);
        await showFileDetail(cwd, "technical", result.technicalExists, ctx);
        await showFileDetail(cwd, "structure", result.structureExists, ctx);
      }
    } catch (error) {
      console.error(
        chalk.red(
          `Failed to show context: ${(error as Error).message}`,
        ),
      );
      process.exitCode = 1;
    }
  });

async function showFileDetail(
  cwd: string,
  name: string,
  exists: boolean,
  ctx: { files: Record<string, unknown> },
): Promise<void> {
  if (!exists) return;

  const filePath = resolveFilePath(ctx.files[name]);
  if (!filePath) return;

  const fullPath = fs.joinPath(cwd, REQORD_DIR, filePath);
  try {
    const content = await fs.readText(fullPath);
    console.log(chalk.cyan(`--- ${name} (${filePath}) ---`));
    console.log(content);
  } catch {
    // skip unreadable files
  }
}
