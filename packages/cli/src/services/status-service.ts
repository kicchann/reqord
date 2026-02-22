import type { Requirement, Specification, TaskEntry } from "@reqord/shared";
import { checkConsistency, TasksIndexSchema, REQORD_DIR, ISSUES_DIR } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";
import * as fs from "../repositories/file-system.js";
import * as feedbackRepo from "../repositories/feedback.js";

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

export function buildIssueSummary(tasks: TaskEntry[]): IssueSummary {
  let total = 0;
  let closed = 0;
  for (const task of tasks) {
    total++;
    if (task.status === "closed") closed++;
  }
  const open = total - closed;
  const closedPercentage =
    total > 0 ? Math.round((closed / total) * 100) : 0;
  return { total, closed, open, closedPercentage };
}

async function loadAllTasks(cwd: string): Promise<TaskEntry[]> {
  const tasksPath = fs.joinPath(cwd, REQORD_DIR, ISSUES_DIR, "tasks.yaml");
  if (!(await fs.exists(tasksPath))) return [];
  const raw = await fs.readYAML<unknown>(tasksPath);
  const parsed = TasksIndexSchema.parse(raw);
  return parsed.tasks;
}

async function loadTasksForSpec(cwd: string, specificationId: string): Promise<TaskEntry[]> {
  const allTasks = await loadAllTasks(cwd);
  return allTasks.filter((t) => t.linkedTo.specifications.includes(specificationId));
}

export async function detectWarnings(
  cwd: string,
  requirements: Requirement[],
  specifications: Specification[],
): Promise<Warning[]> {
  const warnings: Warning[] = [];
  const feedbackIndex = await feedbackRepo.loadIndex(cwd);
  const allFeedbacks = feedbackIndex.feedbacks;

  for (const req of requirements) {
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

    if (req.status === "deprecated") continue;

    const hasSpec = specifications.some(
      (s) => s.requirementId === req.id && s.status !== "deprecated",
    );
    if (!hasSpec && req.status !== "draft") {
      warnings.push({
        id: req.id,
        type: "no-specification",
        message: `No specification created`,
        severity: "warning",
      });
    }

    for (const depId of req.dependencies?.blockedBy ?? []) {
      const dep = requirements.find((r) => r.id === depId);
      if (dep && dep.status !== "approved" && dep.status !== "implemented") {
        warnings.push({
          id: req.id,
          type: "blocked-dependency",
          message: `Dependency ${depId} is not approved (current: ${dep.status})`,
          severity: "warning",
        });
      }
    }

    // Check for unresolved feedbacks
    const reqFeedbacks = allFeedbacks.filter((f) => {
      const linked = f.linkedTo.requirements.includes(req.id);
      const resolved = f.linkedTo.resolved?.requirements?.includes(req.id) ?? false;
      return linked && !resolved;
    });
    for (const fb of reqFeedbacks) {
      warnings.push({
        id: req.id,
        type: "feedback-review",
        message: `Unresolved feedback: #${fb.githubIssue} (${fb.type ?? "unclassified"}, ${fb.severity ?? "medium"})`,
        severity: "info",
      });
    }
  }

  for (const spec of specifications) {
    if (spec.status === "deprecated") continue;
    const req = requirements.find((r) => r.id === spec.requirementId);

    if (
      req &&
      (spec.status === "approved" || spec.status === "implemented") &&
      req.status === "draft"
    ) {
      warnings.push({
        id: spec.id,
        type: "status-inconsistency",
        message: `Specification is ${spec.status} but requirement ${req.id} is still draft`,
        severity: "warning",
      });
    }

    if (spec.designValidation && spec.designValidation.errors > 0) {
      warnings.push({
        id: spec.id,
        type: "validation-failed",
        message: `Design validation failed (${spec.designValidation.errors} error(s))`,
        severity: "warning",
      });
    }

    const specFeedbacks = allFeedbacks.filter((f) => {
      const linked = f.linkedTo.specifications.includes(spec.id);
      const resolved = f.linkedTo.resolved?.specifications?.includes(spec.id) ?? false;
      return linked && !resolved;
    });
    for (const fb of specFeedbacks) {
      warnings.push({
        id: spec.id,
        type: "feedback-review",
        message: `Unresolved feedback: #${fb.githubIssue} (${fb.type ?? "unclassified"}, ${fb.severity ?? "medium"})`,
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
  const allTasks = await loadAllTasks(cwd);

  return {
    requirements: buildStatusSummary(requirements),
    specifications: buildStatusSummary(specifications),
    issues: buildIssueSummary(allTasks),
    warnings: await detectWarnings(cwd, requirements, specifications),
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

  const relatedSpecIds = new Set(relatedSpecs.map((s) => s.id));
  const allTasks = await loadAllTasks(cwd);
  const reqTasks = allTasks.filter((t) =>
    t.linkedTo.specifications.some((specId) => relatedSpecIds.has(specId)),
  );

  let totalIssues = 0;
  let completedIssues = 0;
  for (const task of reqTasks) {
    totalIssues++;
    if (task.status === "closed") completedIssues++;
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

  const specTasks = await loadTasksForSpec(cwd, specId);

  let totalIssues = 0;
  let completedIssues = 0;
  for (const task of specTasks) {
    totalIssues++;
    if (task.status === "closed") completedIssues++;
  }

  const designValidation = specification.designValidation
    ? {
        passed: specification.designValidation.passed,
        warnings: specification.designValidation.warnings,
        errors: specification.designValidation.errors,
      }
    : undefined;

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
