import type { ProjectSettings } from "@reqord/shared";
import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";

export interface ApprovalTarget {
  type: "requirement" | "specification";
  id: string;
  version: string;
  status: string;
  title: string;
  files: string[]; // paths to stage in git
}

export interface ApprovalHandler {
  /** Re-validate entity state from disk before making changes */
  revalidate(cwd: string, target: ApprovalTarget): Promise<void>;
  /** Update entity status to approved, returns new version */
  updateStatus(cwd: string, target: ApprovalTarget): Promise<string>;
  /** Build PR title */
  buildPrTitle(target: ApprovalTarget): string;
  /** Build PR body */
  buildPrBody(target: ApprovalTarget): string;
}

export interface ApprovalResult {
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
}

export interface ApprovalOptions {
  dryRun?: boolean;
}

function buildBranchName(target: ApprovalTarget, settings?: ProjectSettings): string {
  const prefix = settings?.branchNaming?.toApprovedPrefix ?? "reqord";
  return `${prefix}/${target.id}-approve-v${target.version}`;
}

export async function startApproval(
  cwd: string,
  target: ApprovalTarget,
  handler: ApprovalHandler,
  settings: ProjectSettings,
  options?: ApprovalOptions,
): Promise<ApprovalResult> {
  // 1. Precondition check
  if (target.status !== "draft") {
    throw new Error(
      `Cannot start approval: ${target.id} status is "${target.status}", expected "draft".`
    );
  }

  const branchName = buildBranchName(target, settings);

  // 2. Dry-run mode
  if (options?.dryRun) {
    const prTitle = handler.buildPrTitle(target);
    console.log(`[dry-run] Create branch: ${branchName}`);
    console.log(`[dry-run] Status change: draft → approved`);
    console.log(`[dry-run] Create PR: ${prTitle}`);
    return settings.statusTransitionPr.draftToApproved
      ? { branchName, prNumber: 0, prUrl: "" }
      : {};
  }

  // 3. Re-validate
  await handler.revalidate(cwd, target);

  if (settings.statusTransitionPr.draftToApproved) {
    // PR flow: branch → update → commit → push → PR
    const originalBranch = await gitRepo.getCurrentBranch(cwd);

    try {
      // 4. Create and switch to approval branch
      await gitRepo.createBranch(cwd, branchName);
      await gitRepo.checkout(cwd, branchName);

      // 5. Update status via handler
      const newVersion = await handler.updateStatus(cwd, target);

      // 6. Stage and commit
      await gitRepo.add(cwd, target.files);
      await gitRepo.commit(cwd, `chore(reqord): request approval for ${target.id}`);
      await gitRepo.push(cwd, branchName);

      // 7. Build PR title/body AFTER updateStatus to use newVersion
      const updatedTarget = { ...target, version: newVersion };
      const prTitle = handler.buildPrTitle(updatedTarget);
      const prBody = handler.buildPrBody(updatedTarget);

      // 8. Create PR
      const prInfo = await githubRepo.createPullRequest({
        title: prTitle,
        body: prBody,
        head: branchName,
      });

      return {
        branchName,
        prNumber: prInfo.number,
        prUrl: prInfo.url,
      };
    } finally {
      try {
        await gitRepo.checkout(cwd, originalBranch);
      } catch {
        // Best-effort restore
      }
    }
  } else {
    // Direct commit flow: update status on current branch
    await handler.updateStatus(cwd, target);
    await gitRepo.add(cwd, target.files);
    await gitRepo.commit(cwd, `chore(reqord): approve ${target.id} (direct commit)`);

    return {};
  }
}
