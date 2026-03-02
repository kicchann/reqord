import type { ProjectSettings } from "@reqord/shared";
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

function buildBranchName(id: string, settings: ProjectSettings): string {
  const prefix = settings.branchNaming.toDraftPrefix;
  return `${prefix}/${id}-revert-to-draft`;
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
  entityType: "requirement" | "specification",
): string {
  const isSpec = entityType === "specification";
  const entityLabel = isSpec ? "Specification" : "Requirement";
  const heading = isSpec ? "Specification Reversion to Draft" : "Requirement Reversion to Draft";
  const impactLabel = isSpec
    ? "The following requirements depend on this specification's parent requirement:"
    : "The following requirements depend on this requirement:";
  const noImpactLabel = "None (no impact on other requirements)";

  const impactSection =
    impactedRequirements.length > 0
      ? impactedRequirements.map((rid) => `- ${rid}`).join("\n")
      : noImpactLabel;

  return `## ${heading}

| Field | Value |
|-----------|------|
| ID | ${id} |
| Title | ${title} |
| Version | ${version} |
| Previous Status | ${previousStatus} |

### Impact Analysis
${impactLabel}
${impactSection}

### Changes
status: ${previousStatus} → draft

> Merging this PR will revert the ${entityLabel} status to \`draft\`.`;
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
    return { status: spec.status, title: spec.title ?? id, version: spec.version };
  }
  const req = await reqRepo.findByIdOrThrow(cwd, id);
  return { status: req.status, title: req.title, version: req.version };
}

function extractImpactedRequirements(impact: ImpactAnalysis): string[] {
  return impact.directImpacts
    .filter((entry) => entry.relation === "blocks")
    .map((entry) => entry.id);
}

async function analyzeSpecImpact(
  cwd: string,
  impact: ImpactAnalysis,
): Promise<string[]> {
  // For specifications, analyze impact via the parent requirement
  if (impact.parentRequirement) {
    const parentImpact = await analyzeImpact(cwd, impact.parentRequirement.id);
    return extractImpactedRequirements(parentImpact);
  }
  return [];
}

export async function revertToDraft(
  cwd: string,
  id: string,
  settings: ProjectSettings,
  options?: DraftReversionOptions,
): Promise<DraftReversionResult> {
  // 1. Load entity and check precondition
  const entity = await loadEntity(cwd, id);
  if (entity.status === "draft") {
    throw new Error(`Cannot revert to draft: ${id} is already in draft status.`);
  }

  const previousStatus = entity.status;
  const { type: entityType, dir } = getEntityInfo(id);

  // 2. Analyze impact
  const impact = await analyzeImpact(cwd, id);
  const impactedRequirements = entityType === "specification"
    ? await analyzeSpecImpact(cwd, impact)
    : extractImpactedRequirements(impact);

  // 3. Dry-run mode
  if (options?.dryRun) {
    return { previousStatus, impactedRequirements };
  }

  const filePath = `${REQORD_DIR}/${dir}/${id}.yaml`;

  async function performStatusUpdate(): Promise<void> {
    if (id.startsWith("spec-")) {
      await updateSpecification(cwd, id, { status: "draft" });
    } else {
      await updateRequirement(cwd, id, { status: "draft" });
    }
  }

  if (settings.statusTransitionPr.toDraft) {
    // PR flow: save original branch, create reversion branch, update status, commit, push, PR
    const originalBranch = await gitRepo.getCurrentBranch(cwd);
    const branchName = buildBranchName(id, settings);

    try {
      // Create and switch to reversion branch
      await gitRepo.createBranch(cwd, branchName);
      await gitRepo.checkout(cwd, branchName);

      // Update status on the PR branch
      await performStatusUpdate();

      // Stage, commit, push
      await gitRepo.add(cwd, [filePath]);
      await gitRepo.commit(cwd, `chore(reqord): revert ${id} to draft`);
      await gitRepo.push(cwd, branchName);

      // Create PR
      const prTitle = buildPrTitle(id, entity.title);
      const prBody = buildPrBody(
        id,
        entity.title,
        entity.version,
        previousStatus,
        impactedRequirements,
        entityType,
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
  } else {
    // Direct commit flow: update status and commit on current branch, no PR
    await performStatusUpdate();
    await gitRepo.add(cwd, [filePath]);
    await gitRepo.commit(cwd, `chore(reqord): revert ${id} to draft (direct commit)`);

    return {
      previousStatus,
      impactedRequirements,
    };
  }
}
