"use client";

import React, { useState } from "react";
import type { CriticalPathItem } from "@/lib/dashboard-data";

type CriticalPathDisplayProps = {
  items: CriticalPathItem[];
};

const INITIAL_DISPLAY_COUNT = 10;

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
      <div className="space-y-3">
        {(openItems.length > 0
          ? openItems
          : (showClosed ? closedItems : closedItems.slice(0, INITIAL_DISPLAY_COUNT))
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

          return (
            <div
              key={item.issueNumber}
              data-testid="critical-path-item"
              className={`flex items-start gap-3 rounded-md border border-gray-200 p-3 ${textClass}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    #{item.issueNumber}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{item.title}</p>
                <p className="mt-1 text-xs text-gray-500">{item.status}</p>
              </div>
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
