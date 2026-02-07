import { Command } from "commander";
import chalk from "chalk";
import type { Status, Priority } from "@reqord/shared";
import {
  updateRequirement,
  type UpdateOptions,
} from "../../services/requirement-service.js";
import * as fs from "../../repositories/file-system.js";

export const updateCommand = new Command("update")
  .description("Update a requirement")
  .argument("<id>", "Requirement ID (e.g. req-000001)")
  .option("-t, --title <title>", "New title")
  .option("-s, --status <status>", "New status (draft, pending_approval, approved, deprecated)")
  .option("-p, --priority <priority>", "New priority (low, medium, high)")
  .option("--patch-file <path>", "JSON file with partial update data")
  .option("--description-file <path>", "Markdown file to replace description.md")
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
        json?: boolean;
      },
    ) => {
      const cwd = process.cwd();

      const hasAnyOption =
        options.title !== undefined ||
        options.status !== undefined ||
        options.priority !== undefined ||
        options.patchFile !== undefined ||
        options.descriptionFile !== undefined;

      if (!hasAnyOption) {
        console.error(
          chalk.red(
            "Error: At least one option (--title, --status, --priority, --patch-file, --description-file) is required.",
          ),
        );
        process.exitCode = 1;
        return;
      }

      try {
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
            console.error(
              chalk.red(`Error: Invalid JSON in patch file: ${options.patchFile}`),
            );
            process.exitCode = 1;
            return;
          }
        }

        // Description file
        if (options.descriptionFile) {
          updateOpts.descriptionContent = await fs.readText(options.descriptionFile);
        }

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
        console.error(
          chalk.red(
            `Failed to update requirement: ${(error as Error).message}`,
          ),
        );
        process.exitCode = 1;
      }
    },
  );
