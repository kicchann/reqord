import React from "react";
import { ProgressBar } from "./progress-bar";
import type { CategorySummary, IssueSummary } from "@/lib/dashboard-data";

type ProgressSectionProps = {
  requirements: CategorySummary;
  specifications: CategorySummary;
  issues: IssueSummary;
};

export function ProgressSection({
  requirements,
  specifications,
  issues,
}: ProgressSectionProps) {
  const reqApproved = Math.round(requirements.total * requirements.approvalRate);
  const reqPercentage = Math.round(requirements.approvalRate * 100);

  const specApproved = Math.round(
    specifications.total * specifications.approvalRate
  );
  const specPercentage = Math.round(specifications.approvalRate * 100);

  const issuesPercentage = Math.round(issues.completionRate * 100);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProgressBar
          label="Requirements"
          current={reqApproved}
          total={requirements.total}
          percentage={reqPercentage}
          color="blue"
        />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProgressBar
          label="Specifications"
          current={specApproved}
          total={specifications.total}
          percentage={specPercentage}
          color="purple"
        />
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <ProgressBar
          label="Issues"
          current={issues.completed}
          total={issues.total}
          percentage={issuesPercentage}
          color="green"
        />
      </div>
    </div>
  );
}
