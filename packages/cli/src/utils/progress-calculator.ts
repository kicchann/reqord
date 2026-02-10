import type { ImplementationIssue } from "@reqord/shared";

export interface ProgressInfo {
  total: number;
  completed: number;
  percentage: number;
}

export function calculateProgress(issues: ImplementationIssue[]): ProgressInfo {
  const total = issues.length;
  const completed = issues.filter((issue) => issue.status === "closed").length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    percentage,
  };
}
