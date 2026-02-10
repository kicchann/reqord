import React from "react";
import { STATE_COLORS } from "./gantt-constants";

const LEGEND_ITEMS = [
  { key: "closed", label: "Completed" },
  { key: "in_progress", label: "In Progress" },
  { key: "blocked", label: "Blocked" },
  { key: "open", label: "Pending" },
] as const;

export function GanttLegend() {
  return (
    <div className="flex gap-4 items-center mt-4">
      {LEGEND_ITEMS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-2">
          <div
            data-testid={`legend-indicator-${key}`}
            className="w-4 h-4 rounded"
            style={{ backgroundColor: STATE_COLORS[key] }}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      ))}
    </div>
  );
}
