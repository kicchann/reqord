import { Command } from "commander";
import chalk from "chalk";
import type { Requirement, Specification, Status, VersionHistoryEntry } from "@reqord/shared";
import * as reqRepo from "../../repositories/requirement.js";
import * as specRepo from "../../repositories/specification.js";
import * as versionService from "../../services/version-service.js";
import { handleError } from "../../utils/error-handler.js";
import { AppError, ErrorCode } from "../../utils/errors.js";

interface VersionTarget {
  version: string;
  status: Status;
  updatedAt: string;
  versionHistory: VersionHistoryEntry[];
}

function bumpVersion(
  before: VersionTarget,
  bumpType: "major" | "patch",
  summary: string,
): { after: VersionTarget; historyEntry: VersionHistoryEntry } {
  const nextVersion = versionService.applyVersionBump(before.version, bumpType);
  const historyEntry = versionService.createHistoryEntry(
    { version: nextVersion, status: before.status },
    { summary },
  );

  const after = {
    ...before,
    version: nextVersion,
    updatedAt: historyEntry.changedAt,
    versionHistory: [...before.versionHistory, historyEntry],
  };

  return { after, historyEntry };
}

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
      const summary = options.summary ?? `Version bumped (${bumpType})`;

      let before: VersionTarget;
      let after: VersionTarget;

      if (id.startsWith("req-")) {
        before = await reqRepo.findByIdOrThrow(cwd, id);
        ({ after } = bumpVersion(before, bumpType, summary));
        await reqRepo.save(cwd, after as unknown as Requirement);

      } else if (id.startsWith("spec-")) {
        before = await specRepo.findByIdOrThrow(cwd, id);
        ({ after } = bumpVersion(before, bumpType, summary));
        await specRepo.save(cwd, after as unknown as Specification);

      } else {
        throw new AppError(
          `Invalid ID format: ${id}. Must start with 'req-' or 'spec-'.`,
          ErrorCode.INVALID_ARGUMENT,
        );
      }

      if (options.json) {
        console.log(JSON.stringify(after, null, 2));
        return;
      }

      console.log(chalk.green(`Version bumped: ${id}`));
      console.log(`  version: ${before.version} → ${after.version}`);
      console.log(`  history: ${summary}`);
    } catch (error) {
      handleError(error, { json: options.json });
    }
  });
