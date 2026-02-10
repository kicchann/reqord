import type { Requirement, Specification } from "@reqord/shared";
import { getAllRequirements } from "./data";
import { getAllSpecifications } from "./specification-data";

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

function calculateIssueSummary(specifications: Specification[]): IssueSummary {
  let totalIssues = 0;
  let completedIssues = 0;

  for (const spec of specifications) {
    if (spec.implementation) {
      for (const issue of spec.implementation.issues) {
        totalIssues++;
        if (issue.status === "closed") {
          completedIssues++;
        }
      }
    }
  }

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

  // Build a map of requirement IDs to specifications
  const specsByReqId = new Map<string, Specification[]>();
  for (const spec of specifications) {
    const specs = specsByReqId.get(spec.requirementId) || [];
    specs.push(spec);
    specsByReqId.set(spec.requirementId, specs);
  }

  // Build a map of requirement IDs to requirements for dependency checks
  const reqMap = new Map<string, Requirement>();
  for (const req of requirements) {
    reqMap.set(req.id, req);
  }

  // Check for missing specifications (non-draft requirements without specs)
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

  // Check for unapproved dependencies
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

  // Check for design verification errors (feedback flags with critical/high severity)
  for (const spec of specifications) {
    const hasErrorFlag = spec.flags.some(
      (flag) => flag.severity === "critical" || flag.severity === "high"
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
  specifications: Specification[]
): CriticalPathItem[] | null {
  const items: CriticalPathItem[] = [];

  for (const spec of specifications) {
    if (spec.implementation) {
      for (const issue of spec.implementation.issues) {
        items.push({
          issueNumber: issue.number,
          title: issue.title,
          url: issue.url,
          priority: issue.priority,
          status: issue.status,
          estimatedHours: spec.implementation.totalEstimatedHours,
          specId: spec.id,
        });
      }
    }
  }

  return items.length > 0 ? items : null;
}

export async function getDashboardData(): Promise<DashboardData> {
  const requirements = await getAllRequirements();
  const specifications = await getAllSpecifications();

  // Calculate requirements summary
  const requirementsBreakdown = groupByStatus(requirements);
  const requirementsApprovalRate = calculateApprovalRate(requirements);

  // Calculate specifications summary
  const specificationsBreakdown = groupByStatus(specifications);
  const specificationsApprovalRate = calculateApprovalRate(specifications);

  // Calculate issues summary
  const issues = calculateIssueSummary(specifications);

  // Calculate health score (weighted average)
  const healthScore =
    requirementsApprovalRate * HEALTH_WEIGHTS.requirements +
    specificationsApprovalRate * HEALTH_WEIGHTS.specifications +
    issues.completionRate * HEALTH_WEIGHTS.issues;

  // Detect warnings
  const warnings = detectWarnings(requirements, specifications);

  // Extract critical path
  const criticalPath = extractCriticalPath(specifications);

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
