import React from "react";

type ProjectHealthProps = {
  score: number;
};

export function ProjectHealth({ score }: ProjectHealthProps) {
  const roundedScore = Math.round(score);

  let colorClass = "text-red-300";
  if (roundedScore >= 80) {
    colorClass = "text-emerald-300";
  } else if (roundedScore >= 50) {
    colorClass = "text-yellow-300";
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white shadow-lg">
      <h2 className="text-sm font-medium uppercase tracking-wider text-brand-200">
        Project Health
      </h2>
      <div className="mt-4 flex items-baseline justify-center">
        <span
          data-testid="health-score"
          className={`text-7xl font-extrabold tabular-nums ${colorClass}`}
        >
          {roundedScore}
        </span>
        <span className="ml-2 text-2xl text-brand-200">/ 100</span>
      </div>
    </div>
  );
}
