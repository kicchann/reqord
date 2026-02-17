import type { Requirement, Specification, Status } from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";
import * as specRepo from "../repositories/specification.js";

export type CoverageStatus = "covered" | "partial" | "not-covered";

export interface RequirementCoverage {
  requirementId: string;
  title: string;
  status: CoverageStatus;
  specifications: Array<{
    id: string;
    status: Status;
  }>;
}

export interface CoverageReport {
  requirements: RequirementCoverage[];
  summary: {
    covered: number;
    partial: number;
    notCovered: number;
    total: number;
  };
  analyzedAt: string;
}

export function determineCoverage(
  specs: Array<{ status: Status }>,
): CoverageStatus {
  if (specs.length === 0) return "not-covered";
  const hasApprovedOrImplemented = specs.some(
    (s) => s.status === "approved" || s.status === "implemented",
  );
  if (hasApprovedOrImplemented) return "covered";
  return "partial";
}

export function buildCoverageReport(
  requirements: Requirement[],
  specifications: Specification[],
): CoverageReport {
  const activeReqs = requirements.filter(
    (r) => r.status !== "deprecated",
  );

  const coverages: RequirementCoverage[] = activeReqs.map((req) => {
    const relatedSpecs = specifications
      .filter(
        (s) => s.requirementId === req.id && s.status !== "deprecated",
      )
      .map((s) => ({ id: s.id, status: s.status as Status }));

    return {
      requirementId: req.id,
      title: req.title,
      status: determineCoverage(relatedSpecs),
      specifications: relatedSpecs,
    };
  });

  const summary = {
    covered: coverages.filter((c) => c.status === "covered").length,
    partial: coverages.filter((c) => c.status === "partial").length,
    notCovered: coverages.filter((c) => c.status === "not-covered").length,
    total: coverages.length,
  };

  return {
    requirements: coverages,
    summary,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeRequirementCoverage(
  cwd: string,
  requirementId?: string,
): Promise<CoverageReport> {
  let requirements: Requirement[];
  if (requirementId) {
    const req = await reqRepo.findByIdOrThrow(cwd, requirementId);
    requirements = [req];
  } else {
    requirements = await reqRepo.findAll(cwd);
  }

  const specifications = await specRepo.findAll(cwd);
  return buildCoverageReport(requirements, specifications);
}
