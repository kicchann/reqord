import type { Requirement } from "@reqord/shared";
import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import * as reqRepo from "../repositories/requirement.js";

export interface ApprovalTarget {
  type: "requirement" | "specification";
  id: string;
  version: string;
  status: string;
  title: string;
  jsonPath: string; // relative path to JSON file, e.g. ".reqord/requirements/req-000011.json"
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

function buildPrTitle(target: ApprovalTarget): string {
  return `[Reqord] Approve ${target.id}: ${target.title} v${target.version}`;
}

function buildPrBody(target: ApprovalTarget): string {
  return `## 要件承認依頼

| フィールド | 値 |
|-----------|------|
| ID | ${target.id} |
| タイトル | ${target.title} |
| バージョン | ${target.version} |

### 変更内容
status: draft → pending_approval

> このPRをマージすると、要件のステータスが \`approved\` に更新されます。`;
}

export async function startApproval(
  cwd: string,
  target: ApprovalTarget,
  options?: ApprovalOptions,
): Promise<ApprovalResult> {
  // 1. Precondition check
  if (target.status !== "draft") {
    throw new Error(
      `Cannot start approval: ${target.id} status is "${target.status}", expected "draft".`
    );
  }

  const branchName = buildBranchName(target);
  const prTitle = buildPrTitle(target);
  const prBody = buildPrBody(target);

  // 2. Dry-run mode
  if (options?.dryRun) {
    console.log(`[dry-run] ブランチ作成: ${branchName}`);
    console.log(`[dry-run] ステータス変更: draft → pending_approval`);
    console.log(`[dry-run] PR作成: ${prTitle}`);
    return {
      branchName,
      prNumber: 0,
      prUrl: "",
    };
  }

  // 3. Save original branch to restore later
  const originalBranch = await gitRepo.getCurrentBranch(cwd);

  try {
    // 4. Update requirement status to pending_approval
    const requirement = await reqRepo.findById(cwd, target.id);
    if (!requirement) {
      throw new Error(`${target.id} not found.`);
    }
    const updated: Requirement = {
      ...requirement,
      status: "pending_approval",
      updatedAt: new Date().toISOString(),
    };
    await reqRepo.save(cwd, updated);

    // 5. Git operations
    await gitRepo.createBranch(cwd, branchName);
    await gitRepo.checkout(cwd, branchName);
    await gitRepo.add(cwd, [target.jsonPath]);
    await gitRepo.commit(cwd, `chore(reqord): request approval for ${target.id}`);
    await gitRepo.push(cwd, branchName);

    // 6. Create PR
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
    // 7. Restore original branch (only if not dry-run)
    if (!options?.dryRun) {
      try {
        await gitRepo.checkout(cwd, originalBranch);
      } catch {
        // Best-effort restore; don't mask the original error
      }
    }
  }
}
