"use client";

import React from "react";

export interface FeedbackFilterState {
  type?: string;
  severity?: string;
  status?: string;
}

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "all" },
  { value: "bug", label: "bug" },
  { value: "improvement", label: "improvement" },
  { value: "requirement-gap", label: "Req Gap" },
  { value: "spec-mismatch", label: "Spec Mismatch" },
  { value: "security", label: "security" },
];

const SEVERITY_OPTIONS = ["all", "critical", "high", "medium", "low"];
const STATUS_OPTIONS = ["all", "open", "closed"];

function SegmentedButtons({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 w-16">{label}</span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-label={`${label} ${opt.label}`}
            aria-pressed={value === opt.value}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              value === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            data-testid={`filter-${label.toLowerCase()}-${opt.value}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimpleSegmentedButtons({
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
    <SegmentedButtons
      label={label}
      options={options.map((o) => ({ value: o, label: o }))}
      value={value}
      onChange={onChange}
    />
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
      <SimpleSegmentedButtons
        label="Severity"
        options={SEVERITY_OPTIONS}
        value={activeFilters.severity ?? "all"}
        onChange={(v) =>
          onFilterChange({ ...activeFilters, severity: v === "all" ? undefined : v })
        }
      />
      <SimpleSegmentedButtons
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
