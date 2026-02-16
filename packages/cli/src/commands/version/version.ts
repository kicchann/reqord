import { Command } from "commander";
import chalk from "chalk";
import type { VersionHistoryEntry } from "@reqord/shared";
import * as reqRepo from "../../repositories/requirement.js";
import * as specRepo from "../../repositories/specification.js";
import * as versionService from "../../services/version-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

export const versionCommand = new Command("version")
  .description("Increment version of a requirement or specification")
  .argument("<id>", "Requirement or Specification ID (e.g. req-000001, spec-000001)")
  .option("--major", "Major version increment X.0 (default)")
  .option("--patch", "Patch version increment .Y")
  .option("--summary <text>", "Change summary for version history")
  .option("--json", "Output result as JSON")
  .action(async (id: string, options: { major?: boolean; patch?: boolean; summary?: string; json?: boolean }) => {
    const cwd = process.cwd();
    try {
      if (options.major && options.patch) {
        throw new AppError("Only one of --major or --patch can be specified.", ErrorCode.INVALID_ARGUMENT);
      }

      const bumpType: "major" | "patch" = options.patch ? "patch" : "major";

      if (id.startsWith("req-")) {
        const before = await reqRepo.findByIdOrThrow(cwd, id);
        const nextVersion = versionService.applyVersionBump(before.version, bumpType);
        const now = new Date().toISOString();
        const summary = options.summary ?? `Version bumped (${bumpType})`;

        const historyEntry: VersionHistoryEntry = {
          version: nextVersion,
          status: before.status,
          gitCommit: versionService.getCurrentGitCommit(),
          changedAt: now,
          summary,
        };

        const after = {
          ...before,
          version: nextVersion,
          updatedAt: now,
          versionHistory: [...before.versionHistory, historyEntry],
        };

        await reqRepo.save(cwd, after);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Version bumped: ${id}`));
        console.log(`  version: ${before.version} → ${after.version}`);
        console.log(`  history: ${summary}`);

      } else if (id.startsWith("spec-")) {
        const before = await specRepo.findByIdOrThrow(cwd, id);
        const nextVersion = versionService.applyVersionBump(before.version, bumpType);
        const now = new Date().toISOString();
        const summary = options.summary ?? `Version bumped (${bumpType})`;

        const historyEntry: VersionHistoryEntry = {
          version: nextVersion,
          status: before.status,
          gitCommit: versionService.getCurrentGitCommit(),
          changedAt: now,
          summary,
        };

        const after = {
          ...before,
          version: nextVersion,
          updatedAt: now,
          versionHistory: [...before.versionHistory, historyEntry],
        };

        await specRepo.save(cwd, after);

        if (options.json) {
          console.log(JSON.stringify(after, null, 2));
          return;
        }

        console.log(chalk.green(`Version bumped: ${id}`));
        console.log(`  version: ${before.version} → ${after.version}`);
        console.log(`  history: ${summary}`);

      } else {
        throw new AppError(
          `Invalid ID format: ${id}. Must start with 'req-' or 'spec-'.`,
          ErrorCode.INVALID_ARGUMENT,
        );
      }
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
