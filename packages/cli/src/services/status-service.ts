import type { Requirement, Specification } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";

export interface StatusSummary {
  total: number;
  byStatus: Record<string, number>;
  implementedPercentage: number;
}

export interface IssueSummary {
  total: number;
  closed: number;
  open: number;
  closedPercentage: number;
}

export interface Warning {
  id: string;
  type:
    | "no-specification"
    | "blocked-dependency"
    | "status-inconsistency";
  message: string;
}

export interface ProjectStatus {
  requirements: StatusSummary;
  specifications: StatusSummary;
  issues: IssueSummary;
  warnings: Warning[];
  generatedAt: string;
}

export interface RequirementDetailStatus {
  requirement: Requirement;
  specifications: Array<{
    id: string;
    title?: string;
    status: string;
  }>;
  dependencyStatus: Array<{
    id: string;
    title: string;
    status: string;
    relation: "blockedBy" | "blocks" | "relatedTo";
  }>;
  issueProgress: {
    total: number;
    completed: number;
  };
}

export interface SpecificationDetailStatus {
  specification: Specification;
  requirement: {
    id: string;
    title: string;
    status: string;
  } | null;
  issueProgress: {
    total: number;
    completed: number;
  };
}

export function buildStatusSummary(
  items: Array<{ status: string }>,
): StatusSummary {
  const total = items.length;
  const byStatus: Record<string, number> = {};
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
  }
  const implementedCount = byStatus["implemented"] ?? 0;
  const implementedPercentage =
    total > 0 ? Math.round((implementedCount / total) * 100) : 0;
  return { total, byStatus, implementedPercentage };
}

export function buildIssueSummary(specs: Specification[]): IssueSummary {
  let total = 0;
  let closed = 0;
  for (const spec of specs) {
    if (!spec.implementation) continue;
    for (const issue of spec.implementation.issues) {
      total++;
      if (issue.status === "closed") closed++;
    }
  }
  const open = total - closed;
  const closedPercentage =
    total > 0 ? Math.round((closed / total) * 100) : 0;
  return { total, closed, open, closedPercentage };
}

export function detectWarnings(
  requirements: Requirement[],
  specifications: Specification[],
): Warning[] {
  const warnings: Warning[] = [];

  for (const req of requirements) {
    if (req.status === "deprecated") continue;

    // Specificationが存在しない非draft要件
    const hasSpec = specifications.some(
      (s) => s.requirementId === req.id && s.status !== "deprecated",
    );
    if (!hasSpec && req.status !== "draft") {
      warnings.push({
        id: req.id,
        type: "no-specification",
        message: `Specificationが作成されていません`,
      });
    }

    // 依存先が未承認（approved/implementedでない）
    for (const depId of req.dependencies?.blockedBy ?? []) {
      const dep = requirements.find((r) => r.id === depId);
      if (dep && dep.status !== "approved" && dep.status !== "implemented") {
        warnings.push({
          id: req.id,
          type: "blocked-dependency",
          message: `依存先 ${depId} が未承認です（現在: ${dep.status}）`,
        });
      }
    }
  }

  // Req/Spec間のステータス整合性チェック
  for (const spec of specifications) {
    if (spec.status === "deprecated") continue;
    const req = requirements.find((r) => r.id === spec.requirementId);
    if (!req) continue;

    // Specがapproved以上なのにReqがdraft
    if (
      (spec.status === "approved" || spec.status === "implemented") &&
      req.status === "draft"
    ) {
      warnings.push({
        id: spec.id,
        type: "status-inconsistency",
        message: `Specificationが${spec.status}ですが、要件 ${req.id} がまだdraftです`,
      });
    }
  }

  return warnings;
}

export async function getProjectStatus(
  cwd: string,
): Promise<ProjectStatus> {
  const requirements = await reqRepo.findAll(cwd);
  const specifications = await specRepo.findAll(cwd);

  return {
    requirements: buildStatusSummary(requirements),
    specifications: buildStatusSummary(specifications),
    issues: buildIssueSummary(specifications),
    warnings: detectWarnings(requirements, specifications),
    generatedAt: new Date().toISOString(),
  };
}

export async function getRequirementStatus(
  cwd: string,
  reqId: string,
): Promise<RequirementDetailStatus> {
  const requirement = await reqRepo.findByIdOrThrow(cwd, reqId);
  const [allSpecs, allReqs] = await Promise.all([
    specRepo.findAll(cwd),
    reqRepo.findAll(cwd),
  ]);

  const relatedSpecs = allSpecs.filter(
    (s) => s.requirementId === reqId,
  );

  const specifications = relatedSpecs.map((s) => ({
    id: s.id,
    title: s.title,
    status: s.status,
  }));

  const dependencyStatus: RequirementDetailStatus["dependencyStatus"] = [];
  const deps = requirement.dependencies;
  for (const depId of deps.blockedBy) {
    const dep = allReqs.find((r) => r.id === depId);
    if (dep) {
      dependencyStatus.push({
        id: dep.id,
        title: dep.title,
        status: dep.status,
        relation: "blockedBy",
      });
    }
  }
  for (const depId of deps.blocks) {
    const dep = allReqs.find((r) => r.id === depId);
    if (dep) {
      dependencyStatus.push({
        id: dep.id,
        title: dep.title,
        status: dep.status,
        relation: "blocks",
      });
    }
  }
  for (const depId of deps.relatedTo) {
    const dep = allReqs.find((r) => r.id === depId);
    if (dep) {
      dependencyStatus.push({
        id: dep.id,
        title: dep.title,
        status: dep.status,
        relation: "relatedTo",
      });
    }
  }

  let totalIssues = 0;
  let completedIssues = 0;
  for (const spec of relatedSpecs) {
    if (!spec.implementation) continue;
    for (const issue of spec.implementation.issues) {
      totalIssues++;
      if (issue.status === "closed") completedIssues++;
    }
  }

  return {
    requirement,
    specifications,
    dependencyStatus,
    issueProgress: { total: totalIssues, completed: completedIssues },
  };
}

export async function getSpecificationStatus(
  cwd: string,
  specId: string,
): Promise<SpecificationDetailStatus> {
  const specification = await specRepo.findByIdOrThrow(cwd, specId);
  const req = await reqRepo.findById(cwd, specification.requirementId);

  let totalIssues = 0;
  let completedIssues = 0;
  if (specification.implementation) {
    for (const issue of specification.implementation.issues) {
      totalIssues++;
      if (issue.status === "closed") completedIssues++;
    }
  }

  return {
    specification,
    requirement: req
      ? { id: req.id, title: req.title, status: req.status }
      : null,
    issueProgress: { total: totalIssues, completed: completedIssues },
  };
}

export function renderProgressBar(
  percentage: number,
  width: number = 20,
): string {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return "\u2588".repeat(filled) + "\u2591".repeat(empty);
}
