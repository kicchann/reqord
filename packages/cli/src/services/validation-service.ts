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
  const requirement = await reqRepo.findById(cwd, id);
  if (!requirement) {
    throw new Error(`Requirement ${id} not found.`);
  }

  const description = await reqRepo.loadDescription(cwd, id);
  const allRequirements = await reqRepo.findAll(cwd);

  const language = options.language ?? "ja";
  const issues: ValidationIssue[] = [];

  // 1. 曖昧表現検出
  checkAmbiguousPhrases(requirement, description, language, issues);

  // 2. 成功基準の数チェック
  checkSuccessCriteria(requirement, issues);

  // 3. 依存関係の整合性
  const hasDependencyIssues = checkDependencies(requirement, allRequirements, issues);

  // 4. 循環依存検出
  checkCircularDependencies(requirement, allRequirements, issues);

  // 5. 複雑度と見積もり時間の整合性
  checkComplexityHoursConsistency(requirement, issues);

  // SMARTスコア算出
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
          message: `曖昧な表現「${phrase}」が含まれています`,
          suggestion: "具体的な数値や条件に置き換えてください",
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
      message: "成功基準が定義されていません",
      suggestion: "測定可能な成功基準を最低3つ追加してください",
    });
  } else if (count < 3) {
    issues.push({
      type: "insufficient_criteria",
      severity: "warning",
      field: "successCriteria",
      message: `成功基準が${count}件です（推奨: 3件以上）`,
      suggestion: "測定可能な成功基準を追加してください",
    });
  } else if (count > 7) {
    issues.push({
      type: "excessive_criteria",
      severity: "warning",
      field: "successCriteria",
      message: `成功基準が${count}件です（推奨: 7件以下）`,
      suggestion: "成功基準を整理・統合してください",
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
          message: `存在しない要件 ${depId} を参照しています`,
          suggestion: "依存先の要件IDを確認してください",
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
      message: `循環依存が検出されました: ${cycle.join(" → ")}`,
      suggestion: "依存関係を見直し、循環を解消してください",
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
        message: `複雑度「${requirement.estimatedComplexity}」と見積もり時間「${requirement.estimatedHours}h」が整合していません`,
        suggestion: "複雑度または見積もり時間を見直してください",
      });
    }
  }
}
