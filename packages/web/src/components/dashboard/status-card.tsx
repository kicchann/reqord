import React from "react";
import type { StatusBreakdown } from "@/lib/dashboard-data";

type StatusCardProps = {
  title: string;
  total: number;
  breakdown: StatusBreakdown;
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  approved: "bg-blue-50 text-blue-700",
  implemented: "bg-emerald-50 text-emerald-700",
  deprecated: "bg-red-50 text-red-700",
};

export function StatusCard({ title, total, breakdown }: StatusCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(breakdown).map(([status, count]) => {
          const badgeClass =
            STATUS_BADGE_CLASSES[status] ?? "bg-gray-100 text-gray-600";
          return (
            <span
              key={status}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
            >
              {status}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}
