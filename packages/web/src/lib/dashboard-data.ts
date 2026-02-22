import type { Requirement, Specification, TaskEntry } from "@reqord/shared";
import { getAllRequirements } from "./data.js";
import { getAllSpecifications } from "./specification-data.js";
import { loadTasksYaml } from "./tasks-data.js";

export type Warning = {
  type:
    | "missing_specification"
    | "unapproved_dependency"
    | "design_verification_error";
  message: string;
  severity: "error" | "warning" | "info";
  relatedId: string;
};

export type CriticalPathItem = {
  issueNumber: number;
  title: string;
  url: string;
  priority: string;
  status: string;
  estimatedHours: number;
  specId: string;
};

export type StatusBreakdown = Record<string, number>;

export type CategorySummary = {
  total: number;
  breakdown: StatusBreakdown;
  approvalRate: number;
};

export type IssueSummary = {
  total: number;
  completed: number;
  completionRate: number;
};

export type DashboardData = {
  requirements: CategorySummary;
  specifications: CategorySummary;
  issues: IssueSummary;
  healthScore: number;
  warnings: Warning[];
  criticalPath: CriticalPathItem[] | null;
};

// Health score weights
const HEALTH_WEIGHTS = {
  requirements: 40,
  specifications: 30,
  issues: 30,
} as const;

function isApproved(status: string): boolean {
  return status === "approved" || status === "implemented";
}

export function groupByStatus(
  items: Array<{ status: string }>
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const item of items) {
    result[item.status] = (result[item.status] || 0) + 1;
  }

  return result;
}

function calculateApprovalRate(items: Array<{ status: string }>): number {
  if (items.length === 0) {
    return 0;
  }

  const approvedCount = items.filter((item) => isApproved(item.status)).length;

  return approvedCount / items.length;
}

function calculateIssueSummary(tasks: TaskEntry[]): IssueSummary {
  const totalIssues = tasks.length;
  const completedIssues = tasks.filter((t) => t.status === "closed").length;

  return {
    total: totalIssues,
    completed: completedIssues,
    completionRate: totalIssues > 0 ? completedIssues / totalIssues : 0,
  };
}

export function detectWarnings(
  requirements: Requirement[],
  specifications: Specification[]
): Warning[] {
  const warnings: Warning[] = [];

  const specsByReqId = new Map<string, Specification[]>();
  for (const spec of specifications) {
    const specs = specsByReqId.get(spec.requirementId) || [];
    specs.push(spec);
    specsByReqId.set(spec.requirementId, specs);
  }

  const reqMap = new Map<string, Requirement>();
  for (const req of requirements) {
    reqMap.set(req.id, req);
  }

  for (const req of requirements) {
    if (req.status !== "draft") {
      const specs = specsByReqId.get(req.id);
      if (!specs || specs.length === 0) {
        warnings.push({
          type: "missing_specification",
          message: `Requirement ${req.id} has no specification`,
          severity: "warning",
          relatedId: req.id,
        });
      }
    }
  }

  for (const req of requirements) {
    for (const depId of req.dependencies.blockedBy) {
      const dep = reqMap.get(depId);
      if (dep && !isApproved(dep.status)) {
        warnings.push({
          type: "unapproved_dependency",
          message: `Requirement ${req.id} is blocked by unapproved requirement ${depId}`,
          severity: "warning",
          relatedId: req.id,
        });
      }
    }
  }

  for (const spec of specifications) {
    const hasErrorFlag = spec.flags.some(
      (flag) =>
        flag.type === "feedback-review" &&
        (flag.severity === "critical" || flag.severity === "high")
    );

    if (hasErrorFlag) {
      warnings.push({
        type: "design_verification_error",
        message: `Specification ${spec.id} has critical feedback flags requiring attention`,
        severity: "error",
        relatedId: spec.id,
      });
    }
  }

  return warnings;
}

export function extractCriticalPath(
  tasks: TaskEntry[]
): CriticalPathItem[] | null {
  if (tasks.length === 0) {
    return null;
  }

  const items: CriticalPathItem[] = tasks.map((task) => ({
    issueNumber: task.number,
    title: task.title,
    url: task.url,
    priority: task.priority ?? "",
    status: task.status,
    estimatedHours: task.estimatedHours ?? 0,
    specId: task.linkedTo.specifications[0] ?? "",
  }));

  return items;
}

export async function getDashboardData(): Promise<DashboardData> {
  const requirements = await getAllRequirements();
  const specifications = await getAllSpecifications();
  const tasksIndex = await loadTasksYaml();
  const allTasks = tasksIndex.tasks;

  const requirementsBreakdown = groupByStatus(requirements);
  const requirementsApprovalRate = calculateApprovalRate(requirements);

  const specificationsBreakdown = groupByStatus(specifications);
  const specificationsApprovalRate = calculateApprovalRate(specifications);

  const issues = calculateIssueSummary(allTasks);

  const healthScore =
    requirementsApprovalRate * HEALTH_WEIGHTS.requirements +
    specificationsApprovalRate * HEALTH_WEIGHTS.specifications +
    issues.completionRate * HEALTH_WEIGHTS.issues;

  const warnings = detectWarnings(requirements, specifications);
  const criticalPath = extractCriticalPath(allTasks);

  return {
    requirements: {
      total: requirements.length,
      breakdown: requirementsBreakdown,
      approvalRate: requirementsApprovalRate,
    },
    specifications: {
      total: specifications.length,
      breakdown: specificationsBreakdown,
      approvalRate: specificationsApprovalRate,
    },
    issues,
    healthScore,
    warnings,
    criticalPath,
  };
}
