import {
  REQORD_DIR,
  REQUIREMENTS_DIR,
  SPECIFICATIONS_DIR,
} from "@reqord/shared";
import * as gitRepo from "../repositories/git.js";
import * as githubRepo from "../repositories/github.js";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import { updateRequirement } from "./requirement-service.js";
import { updateSpecification } from "./specification-service.js";
import { analyzeImpact, type ImpactAnalysis } from "./impact-service.js";

export interface DraftReversionResult {
  previousStatus: string;
  impactedRequirements: string[];
  prNumber?: number;
  prUrl?: string;
}

export interface DraftReversionOptions {
  dryRun?: boolean;
}

function buildBranchName(id: string): string {
  return `reqord/${id}-revert-to-draft`;
}

function buildPrTitle(id: string, title: string): string {
  return `[Reqord] Revert ${id} to draft: ${title}`;
}

function buildPrBody(
  id: string,
  title: string,
  version: string,
  previousStatus: string,
  impactedRequirements: string[],
): string {
  const impactSection =
    impactedRequirements.length > 0
      ? impactedRequirements.map((rid) => `- ${rid}`).join("\n")
      : "なし（他の要件に影響はありません）";

  return `## 要件差し戻し

| フィールド | 値 |
|-----------|------|
| ID | ${id} |
| タイトル | ${title} |
| バージョン | ${version} |
| 変更前ステータス | ${previousStatus} |

### 影響範囲
以下の要件がこの要件に依存しています:
${impactSection}

### 変更内容
status: ${previousStatus} → draft

> このPRをマージすると、要件のステータスが \`draft\` に差し戻されます。`;
}

function getEntityInfo(id: string): { type: "requirement" | "specification"; dir: string } {
  if (id.startsWith("spec-")) {
    return { type: "specification", dir: SPECIFICATIONS_DIR };
  }
  return { type: "requirement", dir: REQUIREMENTS_DIR };
}

async function loadEntity(
  cwd: string,
  id: string,
): Promise<{ status: string; title: string; version: string }> {
  const { type } = getEntityInfo(id);
  if (type === "specification") {
    const spec = await specRepo.findByIdOrThrow(cwd, id);
    return { status: spec.status, title: id, version: spec.version };
  }
  const req = await reqRepo.findByIdOrThrow(cwd, id);
  return { status: req.status, title: req.title, version: req.version };
}

function extractImpactedRequirements(impact: ImpactAnalysis): string[] {
  return impact.directImpacts
    .filter((entry) => entry.relation === "blocks")
    .map((entry) => entry.id);
}

export async function revertToDraft(
  cwd: string,
  id: string,
  options?: DraftReversionOptions,
): Promise<DraftReversionResult> {
  // 1. Load entity and check precondition
  const entity = await loadEntity(cwd, id);
  if (entity.status === "draft") {
    throw new Error(`Cannot revert to draft: ${id} is already in draft status.`);
  }

  const previousStatus = entity.status;
  const { dir } = getEntityInfo(id);

  // 2. Analyze impact
  const impact = await analyzeImpact(cwd, id);
  const impactedRequirements = extractImpactedRequirements(impact);

  // 3. Dry-run mode
  if (options?.dryRun) {
    const branchName = buildBranchName(id);
    console.log(`[dry-run] ブランチ作成: ${branchName}`);
    console.log(`[dry-run] ステータス変更: ${previousStatus} → draft`);
    if (impactedRequirements.length > 0) {
      console.log(`[dry-run] 影響範囲:`);
      for (const rid of impactedRequirements) {
        console.log(`  - ${rid}`);
      }
    }
    console.log(`[dry-run] PR作成: ${buildPrTitle(id, entity.title)}`);
    return { previousStatus, impactedRequirements };
  }

  // 4. Save original branch
  const originalBranch = await gitRepo.getCurrentBranch(cwd);
  const branchName = buildBranchName(id);
  const filePath = `${REQORD_DIR}/${dir}/${id}.yaml`;

  try {
    // 5. Create and switch to reversion branch
    await gitRepo.createBranch(cwd, branchName);
    await gitRepo.checkout(cwd, branchName);

    // 6. Update status to draft (no version bump)
    if (id.startsWith("spec-")) {
      await updateSpecification(cwd, id, { status: "draft" });
    } else {
      await updateRequirement(cwd, id, { status: "draft" });
    }

    // 7. Stage, commit, push
    await gitRepo.add(cwd, [filePath]);
    await gitRepo.commit(cwd, `chore(reqord): revert ${id} to draft`);
    await gitRepo.push(cwd, branchName);

    // 8. Create PR
    const prTitle = buildPrTitle(id, entity.title);
    const prBody = buildPrBody(
      id,
      entity.title,
      entity.version,
      previousStatus,
      impactedRequirements,
    );

    const prInfo = await githubRepo.createPullRequest({
      title: prTitle,
      body: prBody,
      head: branchName,
    });

    return {
      previousStatus,
      impactedRequirements,
      prNumber: prInfo.number,
      prUrl: prInfo.url,
    };
  } finally {
    try {
      await gitRepo.checkout(cwd, originalBranch);
    } catch {
      console.warn(`Warning: Failed to restore original branch "${originalBranch}".`);
    }
  }
}
