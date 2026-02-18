import type { Requirement } from "../schemas/requirement.js";
import type { Specification } from "../schemas/specification.js";

export type ConsistencyWarningType =
  | "all-specs-implemented"
  | "deprecated-with-active-specs";

export type ConsistencyWarning = {
  type: ConsistencyWarningType;
  requirementId: string;
  specificationIds: string[];
  message: string;
  severity: "warning";
};

export function checkConsistency(
  req: Requirement,
  specs: Specification[],
): ConsistencyWarning[] {
  if (specs.length === 0) {
    return [];
  }

  const warnings: ConsistencyWarning[] = [];

  // 全関連SpecがimplementedだがReqがapproved → 警告
  if (req.status === "approved") {
    const allImplemented = specs.every((s) => s.status === "implemented");
    if (allImplemented) {
      warnings.push({
        type: "all-specs-implemented",
        requirementId: req.id,
        specificationIds: specs.map((s) => s.id),
        message: `All specifications are implemented but requirement ${req.id} is still approved`,
        severity: "warning",
      });
    }
  }

  // Reqがdeprecatedだが関連Specがdraft/approved → 警告
  if (req.status === "deprecated") {
    const activeSpecs = specs.filter(
      (s) => s.status === "draft" || s.status === "approved",
    );
    if (activeSpecs.length > 0) {
      warnings.push({
        type: "deprecated-with-active-specs",
        requirementId: req.id,
        specificationIds: activeSpecs.map((s) => s.id),
        message: `Requirement ${req.id} is deprecated but has active specifications`,
        severity: "warning",
      });
    }
  }

  return warnings;
}
