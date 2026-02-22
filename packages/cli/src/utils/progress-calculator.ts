export interface ProgressInfo {
  total: number;
  completed: number;
  percentage: number;
}

interface IssueWithStatus {
  status: string;
}

export function calculateProgress(issues: IssueWithStatus[]): ProgressInfo {
  const total = issues.length;
  const completed = issues.filter((issue) => issue.status === "closed").length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    percentage,
  };
}
