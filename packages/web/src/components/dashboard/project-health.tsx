"use client";

import React from "react";

type ProjectHealthProps = {
  score: number;
};

export function ProjectHealth({ score }: ProjectHealthProps) {
  const roundedScore = Math.round(score);

  let colorClass = "text-red-500";
  if (roundedScore >= 80) {
    colorClass = "text-green-500";
  } else if (roundedScore >= 50) {
    colorClass = "text-yellow-500";
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Project Health
      </h2>
      <div className="flex items-baseline justify-center">
        <span
          data-testid="health-score"
          className={`text-6xl font-bold ${colorClass}`}
        >
          {roundedScore}
        </span>
        <span className="ml-2 text-2xl text-gray-500">/ 100</span>
      </div>
    </div>
  );
}
