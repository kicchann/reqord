"use client";

import React, { useState } from "react";
import type { CriticalPathItem } from "@/lib/dashboard-data";

type CriticalPathDisplayProps = {
  items: CriticalPathItem[];
};

const INITIAL_DISPLAY_COUNT = 10;

const PRIORITY_BADGE_CLASSES: Record<string, string> = {
  P0: "bg-red-100 text-red-800",
  P1: "bg-red-100 text-red-800",
  P2: "bg-orange-100 text-orange-800",
  P3: "bg-gray-100 text-gray-800",
};

export function CriticalPathDisplay({ items }: CriticalPathDisplayProps) {
  const openItems = items.filter((item) => item.status !== "closed");
  const closedItems = items.filter((item) => item.status === "closed");
  const [showClosed, setShowClosed] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Critical Path
        <span className="ml-2 text-sm font-normal text-gray-500">
          {openItems.length} open / {closedItems.length} closed
        </span>
      </h2>
      {/* Show only open items when they exist; closed items are accessible via the expand button below */}
      <div className="space-y-2">
        {(openItems.length > 0
          ? openItems
          : showClosed
            ? closedItems
            : closedItems.slice(0, INITIAL_DISPLAY_COUNT)
        ).map((item) => {
          const isCompleted = item.status === "closed";
          const isPending =
            item.status === "open" || item.status === "in_progress";

          let textClass = "";
          if (isCompleted) {
            textClass = "line-through";
          } else if (isPending) {
            textClass = "font-bold";
          }

          const badgeClass =
            PRIORITY_BADGE_CLASSES[item.priority] ?? "bg-gray-100 text-gray-800";

          return (
            <div
              key={item.issueNumber}
              data-testid="critical-path-item"
              className={`flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 ${textClass}`}
            >
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                #{item.issueNumber}
              </a>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}
              >
                {item.priority}
              </span>
              <span className="flex-1 text-sm text-gray-700">{item.title}</span>
              <span className="text-xs text-gray-400">{item.status}</span>
            </div>
          );
        })}
      </div>
      {openItems.length === 0 && closedItems.length > INITIAL_DISPLAY_COUNT && (
        <button
          onClick={() => setShowClosed(!showClosed)}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          {showClosed
            ? "Show less"
            : `Show all ${closedItems.length} closed items`}
        </button>
      )}
    </div>
  );
}
