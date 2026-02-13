import { Command } from "commander";
import chalk from "chalk";
import {
  updateSpecification,
  type UpdateSpecOptions,
} from "../../services/specification-service.js";
import * as fs from "../../repositories/file-system.js";
import * as yaml from "js-yaml";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const updateCommand = new Command("update")
  .description("Update a specification")
  .argument("<id>", "Specification ID (e.g. spec-000001)")
  .option("--patch-file <path>", "YAML file with partial update data")
  .option("--design-file <path>", "Markdown file to replace design.md")
  .option("--major", "Force major version increment (X.0.0)")
  .option("--minor", "Force minor version increment (0.X.0)")
  .option("--patch", "Force patch version increment (0.0.X)")
  .option("--json", "Output updated specification as JSON")
  .action(
    async (
      id: string,
      options: {
        patchFile?: string;
        designFile?: string;
        major?: boolean;
        minor?: boolean;
        patch?: boolean;
        json?: boolean;
      },
    ) => {
      const cwd = process.cwd();

      try {
        // Check for mutually exclusive version bump options
        const versionBumpCount = [options.major, options.minor, options.patch].filter(Boolean).length;
        if (versionBumpCount > 1) {
          throw new AppError(
            "Only one of --major, --minor, or --patch can be specified.",
            ErrorCode.INVALID_ARGUMENT,
          );
        }

        const hasAnyOption =
          options.patchFile !== undefined ||
          options.designFile !== undefined ||
          options.major ||
          options.minor ||
          options.patch;

        if (!hasAnyOption) {
          throw new AppError(
            "At least one option (--patch-file, --design-file, --major, --minor, --patch) is required.",
            ErrorCode.INVALID_ARGUMENT,
          );
        }

        const updateOpts: UpdateSpecOptions = {};

        // Patch file (YAML)
        if (options.patchFile) {
          const patchContent = await fs.readText(options.patchFile);
          try {
            updateOpts.patchData = yaml.load(patchContent, { schema: yaml.JSON_SCHEMA }) as Record<string, unknown>;
          } catch {
            throw new AppError(
              `Invalid YAML in patch file: ${options.patchFile}`,
              ErrorCode.VALIDATION_ERROR,
            );
          }
        }

        // Design file
        if (options.designFile) {
          updateOpts.designContent = await fs.readText(options.designFile);
        }

        // Version bump override
        if (options.major) updateOpts.versionBump = "major";
        if (options.minor) updateOpts.versionBump = "minor";
        if (options.patch) updateOpts.versionBump = "patch";

        const { before, after } = await updateSpecification(cwd, id, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Updated specification: ${id}`));
        if (before.status !== after.status) {
          console.log(`  status: ${before.status} → ${after.status}`);
        }
        if (before.version !== after.version) {
          console.log(`  version: ${before.version} → ${after.version}`);
        }
        if (after.versionHistory.length > before.versionHistory.length) {
          const latestEntry = after.versionHistory[after.versionHistory.length - 1];
          console.log(`  history: ${latestEntry.summary}`);
        }
        if (JSON.stringify(before.files.supplementary) !== JSON.stringify(after.files.supplementary)) {
          console.log(`  supplementary: ${before.files.supplementary.length} → ${after.files.supplementary.length} files`);
        }
        if (before.files.design !== after.files.design) {
          console.log(`  design: ${before.files.design} → ${after.files.design}`);
        }
        if (options.designFile) {
          console.log(`  design.md: updated`);
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
