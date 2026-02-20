import type { Requirement } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as github from "../repositories/github.js";

export interface ImpactAnalysis {
  sourceId: string;
  sourceType: "requirement" | "specification";
  parentRequirement?: { id: string; title: string };
  directImpacts: ImpactEntry[];
  indirectImpacts: ImpactEntry[];
  relatedSpecifications: SpecificationRef[];
  relatedIssues: IssueRef[];
  circularDependencies: string[][];
  analyzedAt: string;
}

export interface ImpactEntry {
  id: string;
  relation: "blocks" | "relatedTo";
  depth: number;
  path: string[];
  title: string;
}

export interface SpecificationRef {
  id: string;
  requirementId: string;
  status: string;
}

export interface IssueRef {
  number: number;
  title: string;
  url: string;
  status: string;
  specificationId: string;
}

export async function analyzeImpact(
  cwd: string,
  id: string,
  options?: { maxDepth?: number },
): Promise<ImpactAnalysis> {
  if (id.startsWith("spec-")) {
    return analyzeFromSpecification(cwd, id);
  }
  return analyzeFromRequirement(cwd, id, options);
}

async function analyzeFromRequirement(
  cwd: string,
  id: string,
  options?: { maxDepth?: number },
): Promise<ImpactAnalysis> {
  const allRequirements = await reqRepo.findAll(cwd);
  const allSpecifications = await specRepo.findAll(cwd);
  const reqMap = new Map(allRequirements.map((r) => [r.id, r]));

  if (!reqMap.has(id)) {
    throw new Error(`Requirement ${id} not found.`);
  }

  const maxDepth = options?.maxDepth ?? Infinity;

  const directImpacts: ImpactEntry[] = [];
  const indirectImpacts: ImpactEntry[] = [];

  // BFS traversal
  const visited = new Set<string>();
  visited.add(id);

  interface QueueItem {
    targetId: string;
    relation: "blocks" | "relatedTo";
    depth: number;
    path: string[];
    fromRelatedTo: boolean;
  }

  const queue: QueueItem[] = [];
  const sourceReq = reqMap.get(id);
  if (sourceReq) {
    for (const blockId of sourceReq.dependencies.blocks) {
      queue.push({ targetId: blockId, relation: "blocks", depth: 1, path: [id, blockId], fromRelatedTo: false });
    }
    for (const relId of sourceReq.dependencies.relatedTo) {
      queue.push({ targetId: relId, relation: "relatedTo", depth: 1, path: [id, relId], fromRelatedTo: true });
    }
  }

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visited.has(item.targetId) || item.depth > maxDepth) continue;
    visited.add(item.targetId);

    const targetReq = reqMap.get(item.targetId);
    if (!targetReq) continue;

    const entry: ImpactEntry = {
      id: item.targetId,
      relation: item.relation,
      depth: item.depth,
      path: item.path,
      title: targetReq.title,
    };

    if (item.depth === 1) {
      directImpacts.push(entry);
    } else {
      indirectImpacts.push(entry);
    }

    // Don't continue traversal from relatedTo nodes
    if (item.fromRelatedTo) continue;

    // Enqueue further blocks
    for (const blockId of targetReq.dependencies.blocks) {
      if (!visited.has(blockId)) {
        queue.push({
          targetId: blockId,
          relation: "blocks",
          depth: item.depth + 1,
          path: [...item.path, blockId],
          fromRelatedTo: false,
        });
      }
    }
    // relatedTo is only enqueued from the source node (handled above)
  }

  // Circular dependency detection via DFS on blocks
  const circularDependencies = detectCircularDependencies(id, allRequirements);

  // Related specifications
  const relatedSpecifications: SpecificationRef[] = allSpecifications
    .filter((s) => s.requirementId === id)
    .map((s) => ({ id: s.id, requirementId: s.requirementId, status: s.status }));

  // Related issues from specifications
  const relatedIssues: IssueRef[] = [];
  for (const spec of allSpecifications) {
    if (spec.requirementId === id && spec.implementation) {
      for (const issue of spec.implementation.issues) {
        relatedIssues.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          status: issue.status,
          specificationId: spec.id,
        });
      }
    }
  }

  return {
    sourceId: id,
    sourceType: "requirement",
    directImpacts,
    indirectImpacts,
    relatedSpecifications,
    relatedIssues,
    circularDependencies,
    analyzedAt: new Date().toISOString(),
  };
}

async function analyzeFromSpecification(cwd: string, id: string): Promise<ImpactAnalysis> {
  const spec = await specRepo.findById(cwd, id);
  if (!spec) {
    throw new Error(`Specification ${id} not found.`);
  }

  const allSpecifications = await specRepo.findAll(cwd);
  const parentReq = await reqRepo.findById(cwd, spec.requirementId);

  // Related specs for the same requirement (excluding self)
  const relatedSpecifications: SpecificationRef[] = allSpecifications
    .filter((s) => s.requirementId === spec.requirementId && s.id !== id)
    .map((s) => ({ id: s.id, requirementId: s.requirementId, status: s.status }));

  // Issues from this spec
  const relatedIssues: IssueRef[] = [];
  if (spec.implementation) {
    for (const issue of spec.implementation.issues) {
      relatedIssues.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        status: issue.status,
        specificationId: id,
      });
    }
  }

  return {
    sourceId: id,
    sourceType: "specification",
    parentRequirement: parentReq
      ? { id: parentReq.id, title: parentReq.title }
      : { id: spec.requirementId, title: spec.requirementId },
    directImpacts: [],
    indirectImpacts: [],
    relatedSpecifications,
    relatedIssues,
    circularDependencies: [],
    analyzedAt: new Date().toISOString(),
  };
}

function detectCircularDependencies(startId: string, allRequirements: Requirement[]): string[][] {
  const reqMap = new Map(allRequirements.map((r) => [r.id, r]));
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(id: string): void {
    if (inStack.has(id)) {
      const cycleStart = path.indexOf(id);
      cycles.push(path.slice(cycleStart).concat(id));
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    inStack.add(id);
    path.push(id);

    const req = reqMap.get(id);
    if (req) {
      for (const depId of req.dependencies.blocks) {
        dfs(depId);
      }
    }

    inStack.delete(id);
    path.pop();
  }

  dfs(startId);
  return cycles;
}

export interface NotifyResult {
  notified: NotifiedEntry[];
  skipped: SkippedEntry[];
  dryRun: boolean;
}

export interface NotifiedEntry {
  type: "issue" | "pr";
  number: number;
  title: string;
  comment?: string;
}

export interface SkippedEntry {
  type: "issue" | "pr";
  number: number;
  reason: string;
}

export async function notifyImpact(
  cwd: string,
  id: string,
  options?: { dryRun?: boolean; message?: string },
): Promise<NotifyResult> {
  const dryRun = options?.dryRun ?? false;
  const analysis = await analyzeImpact(cwd, id);

  const issuesWithContext: Array<{
    number: number;
    title: string;
    status: string;
    relation: string;
    path: string;
  }> = [];

  if (analysis.sourceType === "specification") {
    // Spec-origin: collect notification targets from relatedIssues
    for (const issue of analysis.relatedIssues) {
      issuesWithContext.push({
        number: issue.number,
        title: issue.title,
        status: issue.status,
        relation: "specification",
        path: id,
      });
    }
  } else {
    // Requirement-origin: collect related issues from direct/indirect impacts
    const impactedIds = new Set([
      ...analysis.directImpacts.map((e) => e.id),
      ...analysis.indirectImpacts.map((e) => e.id),
    ]);

    const impactMap = new Map<string, ImpactEntry>();
    for (const entry of [...analysis.directImpacts, ...analysis.indirectImpacts]) {
      impactMap.set(entry.id, entry);
    }

    const allSpecs = await specRepo.findAll(cwd);
    for (const spec of allSpecs) {
      if (impactedIds.has(spec.requirementId) && spec.implementation) {
        for (const issue of spec.implementation.issues) {
          const impact = impactMap.get(spec.requirementId);
          issuesWithContext.push({
            number: issue.number,
            title: issue.title,
            status: issue.status,
            relation: impact?.relation ?? "unknown",
            path: impact?.path.join(" → ") ?? "",
          });
        }
      }
    }
  }

  // Dedupe by issue number
  const seen = new Set<number>();
  const deduped = issuesWithContext.filter((issue) => {
    if (seen.has(issue.number)) return false;
    seen.add(issue.number);
    return true;
  });

  const BATCH_WARNING_THRESHOLD = 100;
  if (deduped.length > BATCH_WARNING_THRESHOLD) {
    console.warn(`Warning: ${deduped.length} issues found. This may take a while.`);
  }

  // Get source title
  const sourceLabel = analysis.sourceType === "specification" ? "specification" : "requirement";
  let sourceTitle = id;
  if (analysis.sourceType === "specification" && analysis.parentRequirement) {
    sourceTitle = analysis.parentRequirement.title;
  } else {
    const sourceReq = await reqRepo.findById(cwd, id);
    sourceTitle = sourceReq?.title ?? id;
  }

  const notified: NotifiedEntry[] = [];
  const skipped: SkippedEntry[] = [];

  for (const issue of deduped) {
    if (issue.status !== "open") {
      skipped.push({ type: "issue", number: issue.number, reason: issue.status });
      continue;
    }

    const comment = buildNotificationComment({
      sourceId: id,
      sourceLabel,
      title: sourceTitle,
      relation: issue.relation,
      path: issue.path,
      customMessage: options?.message ?? "",
    });

    if (!dryRun) {
      await github.createIssueComment(issue.number, comment);
    }

    notified.push({
      type: "issue",
      number: issue.number,
      title: issue.title,
      ...(dryRun ? { comment } : {}),
    });
  }

  return { notified, skipped, dryRun };
}

function buildNotificationComment(params: {
  sourceId: string;
  sourceLabel: string;
  title: string;
  relation: string;
  path: string;
  customMessage: string;
}): string {
  const lines = [
    "**reqord Impact Notification**",
    "",
    `${params.sourceLabel} \`${params.sourceId}\` (${params.title}) has been changed.`,
    "This issue may be affected.",
    "",
    `**Relation:** ${params.relation}`,
    `**Path:** ${params.path}`,
  ];

  if (params.customMessage) {
    lines.push("", params.customMessage);
  }

  return lines.join("\n");
}
