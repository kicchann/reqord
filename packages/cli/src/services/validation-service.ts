import type {
  Requirement,
  ValidationResult,
  ValidationIssue,
} from "@reqord/shared";
import {
  calculateSmartScore,
  getAmbiguousPhrases,
  isComplexityHoursConsistent,
} from "@reqord/shared";
import * as reqRepo from "../repositories/requirement.js";

export interface ValidateOptions {
  language?: string;
}

export async function validateRequirement(
  cwd: string,
  id: string,
  options: ValidateOptions = {},
): Promise<ValidationResult> {
  const requirement = await reqRepo.findByIdOrThrow(cwd, id);
  const description = await reqRepo.loadDescription(cwd, id);
  const allRequirements = await reqRepo.findAll(cwd);

  const language = options.language ?? "ja";
  const issues: ValidationIssue[] = [];

  // 1. Ambiguous phrase detection
  checkAmbiguousPhrases(requirement, description, language, issues);

  // 2. Success criteria count check
  checkSuccessCriteria(requirement, issues);

  // 3. Dependency integrity
  const hasDependencyIssues = checkDependencies(requirement, allRequirements, issues);

  // 4. Circular dependency detection
  checkCircularDependencies(requirement, allRequirements, issues);

  // 5. Complexity and estimated hours consistency
  checkComplexityHoursConsistency(requirement, issues);

  // SMART score calculation
  const smartScore = calculateSmartScore({ requirement, description, language });

  const hasErrors = issues.some((i) => i.severity === "error");

  return {
    id,
    valid: !hasErrors,
    issues,
    smartScore,
    metadata: {
      criteriaCount: requirement.successCriteria.length,
      hasDescription: description !== null && description.trim().length > 0,
      hasDependencyIssues,
      validatedAt: new Date().toISOString(),
    },
  };
}

function checkAmbiguousPhrases(
  requirement: Requirement,
  description: string | null,
  language: string,
  issues: ValidationIssue[],
): void {
  const phrases = getAmbiguousPhrases(language);

  const fieldsToCheck: Array<{ field: string; text: string }> = [
    { field: "title", text: requirement.title },
    ...requirement.successCriteria.map((c, i) => ({
      field: `successCriteria[${i}]`,
      text: c,
    })),
  ];
  if (description) {
    fieldsToCheck.push({ field: "description", text: description });
  }

  for (const { field, text } of fieldsToCheck) {
    for (const phrase of phrases) {
      if (text.includes(phrase)) {
        issues.push({
          type: "ambiguous",
          severity: "warning",
          field,
          message: `Ambiguous phrase "${phrase}" detected`,
          suggestion: "Replace with specific numbers or conditions",
        });
      }
    }
  }
}

function checkSuccessCriteria(
  requirement: Requirement,
  issues: ValidationIssue[],
): void {
  const count = requirement.successCriteria.length;

  if (count === 0) {
    issues.push({
      type: "missing_criteria",
      severity: "error",
      field: "successCriteria",
      message: "Success criteria are not defined",
      suggestion: "Add at least 3 measurable success criteria",
    });
  } else if (count < 3) {
    issues.push({
      type: "insufficient_criteria",
      severity: "warning",
      field: "successCriteria",
      message: `Success criteria count is ${count} (recommended: 3 or more)`,
      suggestion: "Add more measurable success criteria",
    });
  } else if (count > 7) {
    issues.push({
      type: "excessive_criteria",
      severity: "warning",
      field: "successCriteria",
      message: `Success criteria count is ${count} (recommended: 7 or fewer)`,
      suggestion: "Consolidate and reduce success criteria",
    });
  }
}

function checkDependencies(
  requirement: Requirement,
  allRequirements: Requirement[],
  issues: ValidationIssue[],
): boolean {
  const allIds = new Set(allRequirements.map((r) => r.id));
  let hasDependencyIssues = false;

  const depArrays: Array<{ field: string; ids: string[] }> = [
    { field: "dependencies.blockedBy", ids: requirement.dependencies.blockedBy },
    { field: "dependencies.blocks", ids: requirement.dependencies.blocks },
    { field: "dependencies.relatedTo", ids: requirement.dependencies.relatedTo },
  ];

  for (const { field, ids } of depArrays) {
    for (const depId of ids) {
      if (!allIds.has(depId)) {
        hasDependencyIssues = true;
        issues.push({
          type: "invalid_dependency",
          severity: "error",
          field,
          message: `References non-existent requirement ${depId}`,
          suggestion: "Verify the dependency requirement ID",
        });
      }
    }
  }

  return hasDependencyIssues;
}

function checkCircularDependencies(
  requirement: Requirement,
  allRequirements: Requirement[],
  issues: ValidationIssue[],
): void {
  const reqMap = new Map(allRequirements.map((r) => [r.id, r]));

  // DFS for circular dependency detection via blockedBy
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(id: string): string[] | null {
    if (inStack.has(id)) {
      const cycleStart = path.indexOf(id);
      return path.slice(cycleStart).concat(id);
    }
    if (visited.has(id)) return null;

    visited.add(id);
    inStack.add(id);
    path.push(id);

    const req = reqMap.get(id);
    if (req) {
      for (const depId of req.dependencies.blockedBy) {
        const cycle = dfs(depId);
        if (cycle) return cycle;
      }
    }

    inStack.delete(id);
    path.pop();
    return null;
  }

  const cycle = dfs(requirement.id);
  if (cycle) {
    issues.push({
      type: "circular_dependency",
      severity: "error",
      field: "dependencies.blockedBy",
      message: `Circular dependency detected: ${cycle.join(" → ")}`,
      suggestion: "Review dependencies and resolve the circular reference",
    });
  }
}

function checkComplexityHoursConsistency(
  requirement: Requirement,
  issues: ValidationIssue[],
): void {
  if (requirement.estimatedComplexity && requirement.estimatedHours) {
    if (!isComplexityHoursConsistent(requirement.estimatedComplexity, requirement.estimatedHours)) {
      issues.push({
        type: "inconsistent_estimate",
        severity: "warning",
        field: "estimatedHours",
        message: `Complexity "${requirement.estimatedComplexity}" and estimated hours "${requirement.estimatedHours}h" are inconsistent`,
        suggestion: "Review and align complexity or estimated hours",
      });
    }
  }
}
