"use client";

import React from "react";

type ProgressBarProps = {
  label: string;
  current: number;
  total: number;
  percentage: number;
  color: string;
};

export function ProgressBar({
  label,
  current,
  total,
  percentage,
  color,
}: ProgressBarProps) {
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
          className={`h-full bg-${color}-500 transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
