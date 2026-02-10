import React from "react";
import type { StatusBreakdown } from "@/lib/dashboard-data";

type StatusCardProps = {
  title: string;
  total: number;
  breakdown: StatusBreakdown;
};

export function StatusCard({ title, total, breakdown }: StatusCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">{total}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {Object.entries(breakdown).map(([status, count]) => (
          <span
            key={status}
            className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
          >
            {status}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}
