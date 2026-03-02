import type { ProjectSettings } from "@reqord/shared";
import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";

export interface StatusTransitionTarget {
  id: string;
  version: string;
  files: string[];
}

export interface StatusTransitionCallbacks {
  /** Update entity status, returns new version */
  updateStatus: (cwd: string) => Promise<string>;
  /** Build branch name for PR flow */
  buildBranchName: (target: StatusTransitionTarget, settings: ProjectSettings) => string;
  /** Build PR title */
  buildPrTitle: (target: StatusTransitionTarget) => string;
  /** Build PR body */
  buildPrBody: (target: StatusTransitionTarget) => string;
  /** Build commit message for direct commit flow */
  buildCommitMessage: (target: StatusTransitionTarget) => string;
}

export interface StatusTransitionResult {
  branchName?: string;
  prNumber?: number;
  prUrl?: string;
}

/**
 * PR経由のステータス遷移と直接コミットの共通フロー。
 * usePr=true: ブランチ作成→ステータス更新→コミット→プッシュ→PR作成
 * usePr=false: 現在のブランチ上でステータス更新→コミット
 */
export async function executeStatusTransition(
  cwd: string,
  target: StatusTransitionTarget,
  callbacks: StatusTransitionCallbacks,
  usePr: boolean,
  settings: ProjectSettings,
): Promise<StatusTransitionResult> {
  if (usePr) {
    return executeWithPr(cwd, target, callbacks, settings);
  } else {
    return executeDirectCommit(cwd, target, callbacks);
  }
}

async function executeWithPr(
  cwd: string,
  target: StatusTransitionTarget,
  callbacks: StatusTransitionCallbacks,
  settings: ProjectSettings,
): Promise<StatusTransitionResult> {
  const branchName = callbacks.buildBranchName(target, settings);
  const originalBranch = await gitRepo.getCurrentBranch(cwd);

  try {
    // Create and switch to transition branch
    await gitRepo.createBranch(cwd, branchName);
    await gitRepo.checkout(cwd, branchName);

    // Update status via callback
    const newVersion = await callbacks.updateStatus(cwd);
    const updatedTarget = { ...target, version: newVersion };

    // Stage and commit
    await gitRepo.add(cwd, target.files);
    await gitRepo.commit(cwd, callbacks.buildCommitMessage(target));
    await gitRepo.push(cwd, branchName);

    // Build PR and create
    const prTitle = callbacks.buildPrTitle(updatedTarget);
    const prBody = callbacks.buildPrBody(updatedTarget);
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
}

async function executeDirectCommit(
  cwd: string,
  target: StatusTransitionTarget,
  callbacks: StatusTransitionCallbacks,
): Promise<StatusTransitionResult> {
  // Update status on current branch
  await callbacks.updateStatus(cwd);

  // Stage and commit
  await gitRepo.add(cwd, target.files);
  await gitRepo.commit(cwd, callbacks.buildCommitMessage(target));

  return {};
}
