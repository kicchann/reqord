import * as specRepo from "../repositories/specification.js";
import * as githubClient from "./github-client.js";
import { calculateProgress, type ProgressInfo } from "../utils/progress-calculator.js";

export interface SyncResult {
  specId: string;
  synced: SyncedIssue[];
  progress: ProgressInfo;
  errors: SyncError[];
}

export interface SyncedIssue {
  number: number;
  title: string;
  previousStatus: string;
  currentStatus: string;
  changed: boolean;
}

export interface SyncError {
  issueNumber: number;
  message: string;
}

export { type ProgressInfo };

export async function syncSpecification(cwd: string, specId: string): Promise<SyncResult> {
  const spec = await specRepo.findByIdOrThrow(cwd, specId);

  if (!spec.implementation) {
    throw new Error(`No implementation found for ${specId}`);
  }

  if (spec.implementation.issues.length === 0) {
    throw new Error(`No issues found for ${specId}`);
  }

  const synced: SyncedIssue[] = [];
  const errors: SyncError[] = [];

  for (const issue of spec.implementation.issues) {
    try {
      const ghIssue = await githubClient.getIssueDetail(issue.number);
      const currentStatus = ghIssue.state;
      const previousStatus = issue.status;

      synced.push({
        number: issue.number,
        title: issue.title,
        previousStatus,
        currentStatus,
        changed: previousStatus !== currentStatus,
      });

      // Update issue status in spec
      issue.status = currentStatus as "open" | "in_progress" | "closed";
    } catch (error) {
      errors.push({
        issueNumber: issue.number,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Calculate and update progress
  const progress = calculateProgress(spec.implementation.issues);
  spec.implementation.progress = {
    ...progress,
    lastSyncedAt: new Date().toISOString(),
  };

  // Update spec metadata
  spec.updatedAt = new Date().toISOString();
  await specRepo.save(cwd, spec);

  return {
    specId,
    synced,
    progress,
    errors,
  };
}

export async function syncAll(cwd: string): Promise<SyncResult[]> {
  const specs = await specRepo.findAll(cwd);
  const results: SyncResult[] = [];

  for (const spec of specs) {
    if (spec.implementation && spec.implementation.issues.length > 0) {
      const result = await syncSpecification(cwd, spec.id);
      results.push(result);
    }
  }

  return results;
}
