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
  /** Save currentApproval field on entity */
  saveCurrentApproval(cwd: string, target: ApprovalTarget, newVersion: string): Promise<void>;
  /** Update currentApproval with actual PR info after PR creation */
  updatePrInfo(cwd: string, target: ApprovalTarget, prNumber: number, prUrl: string): Promise<void>;
  /** Build PR title */
  buildPrTitle(target: ApprovalTarget): string;
  /** Build PR body */
  buildPrBody(target: ApprovalTarget): string;
}

export interface ApprovalResult {
  branchName: string;
  prNumber: number;
  prUrl: string;
}

export interface ApprovalOptions {
  dryRun?: boolean;
}

function buildBranchName(target: ApprovalTarget): string {
  return `reqord/${target.id}-approve-v${target.version}`;
}

export async function startApproval(
  cwd: string,
  target: ApprovalTarget,
  handler: ApprovalHandler,
  options?: ApprovalOptions,
): Promise<ApprovalResult> {
  // 1. Precondition check
  if (target.status !== "draft") {
    throw new Error(
      `Cannot start approval: ${target.id} status is "${target.status}", expected "draft".`
    );
  }

  const branchName = buildBranchName(target);

  // 2. Dry-run mode
  if (options?.dryRun) {
    const prTitle = handler.buildPrTitle(target);
    console.log(`[dry-run] ブランチ作成: ${branchName}`);
    console.log(`[dry-run] ステータス変更: draft → approved`);
    console.log(`[dry-run] PR作成: ${prTitle}`);
    return { branchName, prNumber: 0, prUrl: "" };
  }

  // 3. Re-validate
  await handler.revalidate(cwd, target);

  // 4. Save original branch
  const originalBranch = await gitRepo.getCurrentBranch(cwd);

  try {
    // 5. Create and switch to approval branch
    await gitRepo.createBranch(cwd, branchName);
    await gitRepo.checkout(cwd, branchName);

    // 6. Update status via handler
    const newVersion = await handler.updateStatus(cwd, target);

    // 7. Save currentApproval (placeholder PR info)
    await handler.saveCurrentApproval(cwd, target, newVersion);

    // 8. Stage and commit
    await gitRepo.add(cwd, target.files);
    await gitRepo.commit(cwd, `chore(reqord): request approval for ${target.id}`);
    await gitRepo.push(cwd, branchName);

    // 9. Build PR title/body AFTER updateStatus to use newVersion
    const updatedTarget = { ...target, version: newVersion };
    const prTitle = handler.buildPrTitle(updatedTarget);
    const prBody = handler.buildPrBody(updatedTarget);

    // 10. Create PR
    const prInfo = await githubRepo.createPullRequest({
      title: prTitle,
      body: prBody,
      head: branchName,
    });

    // 11. Update with actual PR info
    await handler.updatePrInfo(cwd, target, prInfo.number, prInfo.url);
    await gitRepo.add(cwd, target.files);
    await gitRepo.commit(cwd, `chore(reqord): update currentApproval with PR #${prInfo.number}`);
    await gitRepo.push(cwd, branchName);

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
}
