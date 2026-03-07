import React from "react";

type ProjectHealthProps = {
  score: number;
};

export function ProjectHealth({ score }: ProjectHealthProps) {
  const roundedScore = Math.round(score);

  let colorClass = "text-red-600";
  if (roundedScore >= 80) {
    colorClass = "text-emerald-600";
  } else if (roundedScore >= 50) {
    colorClass = "text-yellow-600";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-warm-200 bg-warm-100 p-8 shadow-sm">
      <div className="absolute left-0 top-0 h-full w-1.5 bg-accent" />
      <h2 className="text-sm font-medium uppercase tracking-wider text-warm-700">
        Project Health
      </h2>
      <div className="mt-4 flex items-baseline justify-center">
        <span
          data-testid="health-score"
          className={`text-7xl font-extrabold tabular-nums ${colorClass}`}
        >
          {roundedScore}
        </span>
        <span className="ml-2 text-2xl text-warm-500">/ 100</span>
      </div>
    </div>
  );
}
