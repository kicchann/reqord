import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import * as reqRepo from "../repositories/requirement.js";
import { updateRequirement } from "./requirement-service.js";

export interface ApprovalTarget {
  type: "requirement";
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

> マージ後、\`reqord req update ${target.id} --status approved\` でステータスを更新してください。`;
}

export async function startApproval(
  cwd: string,
  target: ApprovalTarget,
  options?: ApprovalOptions,
): Promise<ApprovalResult> {
  // 1. Precondition check (on provided target snapshot)
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

  // 3. Re-validate against the latest requirement loaded from disk
  const requirement = await reqRepo.findById(cwd, target.id);
  if (!requirement) {
    throw new Error(`${target.id} not found.`);
  }
  if (requirement.status !== "draft") {
    throw new Error(
      `Cannot start approval: ${target.id} current status is "${requirement.status}", expected "draft".`
    );
  }
  if (requirement.version !== target.version) {
    throw new Error(
      `Cannot start approval: ${target.id} current version is "${requirement.version}", expected "${target.version}".`
    );
  }

  // 4. Save original branch to restore later
  const originalBranch = await gitRepo.getCurrentBranch(cwd);

  try {
    // 5. Create and switch to approval branch BEFORE modifying files
    await gitRepo.createBranch(cwd, branchName);
    await gitRepo.checkout(cwd, branchName);

    // 6. Update requirement status via service (preserves version bump, history, transition validation)
    const { after } = await updateRequirement(cwd, target.id, { status: "pending_approval" });

    // 7. Update currentApproval field (prNumber will be updated after PR creation)
    const withApproval = {
      ...after,
      currentApproval: {
        version: after.version,
        phase: "requirement" as const,
        prNumber: 0, // placeholder, updated after PR creation
        prUrl: "",
        approvedBy: [],
      },
    };
    await reqRepo.save(cwd, withApproval);

    // 8. Stage and commit
    await gitRepo.add(cwd, [target.jsonPath]);
    await gitRepo.commit(cwd, `chore(reqord): request approval for ${target.id}`);
    await gitRepo.push(cwd, branchName);

    // 9. Create PR
    const prInfo = await githubRepo.createPullRequest({
      title: prTitle,
      body: prBody,
      head: branchName,
    });

    // 10. Update currentApproval with actual PR info
    const finalReq = await reqRepo.findById(cwd, target.id);
    if (finalReq) {
      const updated = {
        ...finalReq,
        currentApproval: {
          ...finalReq.currentApproval!,
          prNumber: prInfo.number,
          prUrl: prInfo.url,
        },
      };
      await reqRepo.save(cwd, updated);
      await gitRepo.add(cwd, [target.jsonPath]);
      await gitRepo.commit(cwd, `chore(reqord): update currentApproval with PR #${prInfo.number}`);
      await gitRepo.push(cwd, branchName);
    }

    return {
      branchName,
      prNumber: prInfo.number,
      prUrl: prInfo.url,
    };
  } finally {
    // 11. Restore original branch
    try {
      await gitRepo.checkout(cwd, originalBranch);
    } catch {
      // Best-effort restore; don't mask the original error
    }
  }
}
