"use client";

import React from "react";

type ProgressBarProps = {
  label: string;
  current: number;
  total: number;
  percentage: number;
  color: string;
};

const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  green: "bg-green-500",
};

export function ProgressBar({
  label,
  current,
  total,
  percentage,
  color,
}: ProgressBarProps) {
  const bgClass = COLOR_CLASSES[color] ?? "bg-gray-500";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-600">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          data-testid="progress-bar-fill"
          className={`h-full ${bgClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
