import type { Requirement, Specification } from "@reqord/shared";
import { checkConsistency } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";

export interface StatusSummary {
  total: number;
  byStatus: Record<string, number>;
  implementedPercentage: number;
  approvedPercentage: number;
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
    | "status-inconsistency"
    | "gap-missing"
    | "validation-failed"
    | "all-specs-implemented"
    | "deprecated-with-active-specs"
    | "feedback-review";
  message: string;
  severity: "warning" | "info";
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
  gapAnalysis: {
    hasAnalysis: boolean;
    coverage?: "full" | "partial" | "none";
    missingCount?: number;
    conflictCount?: number;
  };
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
  designValidation?: {
    passed: number;
    warnings: number;
    errors: number;
  };
  issueProgress: {
    total: number;
    completed: number;
  };
  coverageStatus: "covered" | "partial" | "not-covered";
}

function hasGapAnalysis(
  req: Requirement,
): req is Requirement & {
  gapAnalysis: { coverage?: string; missingCount?: number; conflictCount?: number };
} {
  return (
    "gapAnalysis" in req &&
    req.gapAnalysis != null &&
    typeof req.gapAnalysis === "object"
  );
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
  const approvedCount = (byStatus["approved"] ?? 0) + implementedCount;
  const approvedPercentage =
    total > 0 ? Math.round((approvedCount / total) * 100) : 0;
  return { total, byStatus, implementedPercentage, approvedPercentage };
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

    // Gap Analysisが未実行の承認済み要件
    if (
      !("gapAnalysis" in req && req.gapAnalysis) &&
      req.status === "approved"
    ) {
      warnings.push({
        id: req.id,
        type: "gap-missing",
        message: `Gap Analysisが未実行です`,
        severity: "warning",
      });
    }

    // Specificationが存在しない非draft要件
    const hasSpec = specifications.some(
      (s) => s.requirementId === req.id && s.status !== "deprecated",
    );
    if (!hasSpec && req.status !== "draft") {
      warnings.push({
        id: req.id,
        type: "no-specification",
        message: `Specificationが作成されていません`,
        severity: "warning",
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
          severity: "warning",
        });
      }
    }

    // checkConsistency integration from @reqord/shared
    const relatedSpecs = specifications.filter(
      (s) => s.requirementId === req.id,
    );
    const consistencyWarnings = checkConsistency(req, relatedSpecs);
    for (const cw of consistencyWarnings) {
      warnings.push({
        id: req.id,
        type: cw.type,
        message: cw.message,
        severity: "warning",
      });
    }

    // feedback-review flag detection
    const feedbackFlags =
      req.flags?.filter((f) => f.type === "feedback-review") ?? [];
    for (const flag of feedbackFlags) {
      warnings.push({
        id: req.id,
        type: "feedback-review",
        message: `フィードバックレビュー待ち: ${flag.reason}（関連Issue: ${flag.relatedIssues.map((n) => `#${n}`).join(", ")}）`,
        severity: "info",
      });
    }
  }

  // Spec-level warnings
  for (const spec of specifications) {
    if (spec.status === "deprecated") continue;
    const req = requirements.find((r) => r.id === spec.requirementId);

    // Specがapproved以上なのにReqがdraft
    if (
      req &&
      (spec.status === "approved" || spec.status === "implemented") &&
      req.status === "draft"
    ) {
      warnings.push({
        id: spec.id,
        type: "status-inconsistency",
        message: `Specificationが${spec.status}ですが、要件 ${req.id} がまだdraftです`,
        severity: "warning",
      });
    }

    // 設計検証エラー
    if (spec.designValidation && spec.designValidation.errors > 0) {
      warnings.push({
        id: spec.id,
        type: "validation-failed",
        message: `設計検証が失敗しています（${spec.designValidation.errors} error）`,
        severity: "warning",
      });
    }

    // Specificationのfeedback-reviewフラグ
    const specFeedbackFlags =
      spec.flags?.filter((f) => f.type === "feedback-review") ?? [];
    for (const flag of specFeedbackFlags) {
      warnings.push({
        id: spec.id,
        type: "feedback-review",
        message: `フィードバックレビュー待ち: ${flag.reason}（関連Issue: ${flag.relatedIssues.map((n) => `#${n}`).join(", ")}）`,
        severity: "info",
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

  // gapAnalysis from requirement (if it has the field via extended schema)
  const gapAnalysis: RequirementDetailStatus["gapAnalysis"] =
    hasGapAnalysis(requirement)
      ? {
          hasAnalysis: true,
          coverage: requirement.gapAnalysis.coverage as
            | "full"
            | "partial"
            | "none"
            | undefined,
          missingCount: requirement.gapAnalysis.missingCount,
          conflictCount: requirement.gapAnalysis.conflictCount,
        }
      : { hasAnalysis: false };

  return {
    requirement,
    specifications,
    gapAnalysis,
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

  // Design validation
  const designValidation = specification.designValidation
    ? {
        passed: specification.designValidation.passed,
        warnings: specification.designValidation.warnings,
        errors: specification.designValidation.errors,
      }
    : undefined;

  // Coverage status: based on issue progress
  let coverageStatus: "covered" | "partial" | "not-covered";
  if (totalIssues === 0) {
    coverageStatus = "not-covered";
  } else if (completedIssues === totalIssues) {
    coverageStatus = "covered";
  } else {
    coverageStatus = "partial";
  }

  return {
    specification,
    requirement: req
      ? { id: req.id, title: req.title, status: req.status }
      : null,
    designValidation,
    issueProgress: { total: totalIssues, completed: completedIssues },
    coverageStatus,
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
