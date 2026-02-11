import { Command } from "commander";
import chalk from "chalk";
import {
  updateContext,
  type UpdateContextOptions,
} from "../../services/context-service.js";
import * as fs from "../../repositories/file-system.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const contextUpdateCommand = new Command("update")
  .description("Update project context")
  .option("-n, --name <name>", "New project name")
  .option("-v, --version <version>", "New project version")
  .option("--product <path>", "JSON file to patch product.yaml")
  .option("--technical <path>", "JSON file to patch technical.yaml")
  .option("--structure <path>", "JSON file to patch structure.yaml")
  .option("--json", "Output as JSON")
  .action(
    async (options: {
      name?: string;
      version?: string;
      product?: string;
      technical?: string;
      structure?: string;
      json?: boolean;
    }) => {
      const { name, version, product, technical, structure } = options;
      const cwd = process.cwd();

      try {
        if (!name && !version && !product && !technical && !structure) {
          throw new AppError(
            "At least one option (--name, --version, --product, --technical, --structure) is required.",
            ErrorCode.INVALID_ARGUMENT,
          );
        }
        const updateOpts: UpdateContextOptions = {
          name,
          version,
          productPatch: product ? await loadPatchFile(product) : undefined,
          technicalPatch: technical ? await loadPatchFile(technical) : undefined,
          structurePatch: structure ? await loadPatchFile(structure) : undefined,
        };

        const result = await updateContext(cwd, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.green("Updated project context."));
        if (result.before.name !== result.after.name) {
          console.log(`  name: ${result.before.name} → ${result.after.name}`);
        }
        if (result.before.version !== result.after.version) {
          console.log(
            `  version: ${result.before.version} → ${result.after.version}`,
          );
        }
        if (result.updatedFiles.length > 0) {
          console.log(
            `  files: ${result.updatedFiles.map((f) => `${f}.yaml`).join(", ")} updated`,
          );
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );

async function loadPatchFile(path: string): Promise<Record<string, unknown>> {
  const content = await fs.readText(path);
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid JSON in patch file: ${path}`);
  }
}
