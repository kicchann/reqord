import type { Requirement } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";

export interface ImpactAnalysis {
  sourceId: string;
  sourceType: "requirement" | "specification";
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
    // Enqueue relatedTo (but mark as fromRelatedTo to prevent further traversal)
    for (const relId of targetReq.dependencies.relatedTo) {
      if (!visited.has(relId)) {
        queue.push({
          targetId: relId,
          relation: "relatedTo",
          depth: item.depth + 1,
          path: [...item.path, relId],
          fromRelatedTo: true,
        });
      }
    }
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
