import { Command } from "commander";
import chalk from "chalk";
import type { Status, Priority } from "@reqord/shared";
import {
  updateRequirement,
  type UpdateOptions,
} from "../../services/requirement-service.js";
import * as fs from "../../repositories/file-system.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const updateCommand = new Command("update")
  .description("Update a requirement")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("-t, --title <title>", "New title")
  .option("-s, --status <status>", "New status (draft, pending_approval, approved, deprecated)")
  .option("-p, --priority <priority>", "New priority (low, medium, high)")
  .option("--patch-file <path>", "JSON file with partial update data")
  .option("--description-file <path>", "Markdown file to replace description.md")
  .option("--major", "Force major version increment (X.0.0)")
  .option("--minor", "Force minor version increment (0.X.0)")
  .option("--patch", "Force patch version increment (0.0.X)")
  .option("--json", "Output updated requirement as JSON")
  .action(
    async (
      id: string,
      options: {
        title?: string;
        status?: string;
        priority?: string;
        patchFile?: string;
        descriptionFile?: string;
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
          options.title !== undefined ||
          options.status !== undefined ||
          options.priority !== undefined ||
          options.patchFile !== undefined ||
          options.descriptionFile !== undefined ||
          options.major ||
          options.minor ||
          options.patch;

        if (!hasAnyOption) {
          throw new AppError(
            "At least one option (--title, --status, --priority, --patch-file, --description-file, --major, --minor, --patch) is required.",
            ErrorCode.INVALID_ARGUMENT,
          );
        }

        const updateOpts: UpdateOptions = {};

        // Individual flags
        if (options.title !== undefined) updateOpts.title = options.title;
        if (options.status !== undefined)
          updateOpts.status = options.status as Status;
        if (options.priority !== undefined)
          updateOpts.priority = options.priority as Priority;

        // Patch file
        if (options.patchFile) {
          const patchContent = await fs.readText(options.patchFile);
          try {
            updateOpts.patchData = JSON.parse(patchContent) as Record<string, unknown>;
          } catch {
            throw new AppError(
              `Invalid JSON in patch file: ${options.patchFile}`,
              ErrorCode.VALIDATION_ERROR,
            );
          }
        }

        // Description file
        if (options.descriptionFile) {
          updateOpts.descriptionContent = await fs.readText(options.descriptionFile);
        }

        // Version bump override
        if (options.major) updateOpts.versionBump = "major";
        if (options.minor) updateOpts.versionBump = "minor";
        if (options.patch) updateOpts.versionBump = "patch";

        const { before, after, descriptionUpdated } = await updateRequirement(cwd, id, updateOpts);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Updated requirement: ${id}`));
        if (before.title !== after.title) {
          console.log(`  title: ${before.title} → ${after.title}`);
        }
        if (before.status !== after.status) {
          console.log(`  status: ${before.status} → ${after.status}`);
        }
        if (before.priority !== after.priority) {
          console.log(`  priority: ${before.priority} → ${after.priority}`);
        }
        if (before.version !== after.version) {
          console.log(`  version: ${before.version} → ${after.version}`);
        }
        if (after.versionHistory.length > before.versionHistory.length) {
          const latestEntry = after.versionHistory[after.versionHistory.length - 1];
          console.log(`  history: ${latestEntry.summary}`);
        }
        if (JSON.stringify(before.successCriteria) !== JSON.stringify(after.successCriteria)) {
          console.log(`  successCriteria: ${before.successCriteria.length} → ${after.successCriteria.length} items`);
        }
        if (JSON.stringify(before.format) !== JSON.stringify(after.format)) {
          console.log(`  format: updated`);
        }
        if (JSON.stringify(before.dependencies) !== JSON.stringify(after.dependencies)) {
          console.log(`  dependencies: updated`);
        }
        if (before.estimatedComplexity !== after.estimatedComplexity) {
          console.log(`  estimatedComplexity: ${before.estimatedComplexity ?? "none"} → ${after.estimatedComplexity ?? "none"}`);
        }
        if (before.estimatedHours !== after.estimatedHours) {
          console.log(`  estimatedHours: ${before.estimatedHours ?? "none"} → ${after.estimatedHours ?? "none"}`);
        }
        if (descriptionUpdated) {
          console.log(`  description.md: updated`);
        }
      } catch (error) {
        handleError(error, { json: options.json });
      }
    },
  );
