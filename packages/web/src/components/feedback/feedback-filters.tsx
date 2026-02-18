"use client";

import React from "react";

export interface FeedbackFilterState {
  type?: string;
  severity?: string;
  status?: string;
}

const TYPE_OPTIONS = ["all", "bug", "improvement", "requirement-gap", "spec-mismatch", "security"];
const SEVERITY_OPTIONS = ["all", "critical", "high", "medium", "low"];
const STATUS_OPTIONS = ["all", "open", "closed"];

function SegmentedButtons({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 w-16">{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              value === opt
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            data-testid={`filter-${label.toLowerCase()}-${opt}`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FeedbackFilters({
  activeFilters,
  onFilterChange,
}: {
  activeFilters: FeedbackFilterState;
  onFilterChange: (filters: FeedbackFilterState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4" data-testid="feedback-filters">
      <SegmentedButtons
        label="Type"
        options={TYPE_OPTIONS}
        value={activeFilters.type ?? "all"}
        onChange={(v) =>
          onFilterChange({ ...activeFilters, type: v === "all" ? undefined : v })
        }
      />
      <SegmentedButtons
        label="Severity"
        options={SEVERITY_OPTIONS}
        value={activeFilters.severity ?? "all"}
        onChange={(v) =>
          onFilterChange({ ...activeFilters, severity: v === "all" ? undefined : v })
        }
      />
      <SegmentedButtons
        label="Status"
        options={STATUS_OPTIONS}
        value={activeFilters.status ?? "all"}
        onChange={(v) =>
          onFilterChange({ ...activeFilters, status: v === "all" ? undefined : v })
        }
      />
    </div>
  );
}
