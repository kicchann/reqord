"use client";

import React from "react";
import type { VersionHistoryEntry } from "@reqord/shared";
import { StatusBadge } from "@/components/ui/badge";

type TabHistoryProps = {
  versionHistory: VersionHistoryEntry[];
};

export function TabHistory({ versionHistory }: TabHistoryProps) {
  if (!versionHistory || versionHistory.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No version history yet
      </div>
    );
  }

  return (
    <div className="relative pl-8 border-l-2 border-gray-200">
      {versionHistory.map((entry, index) => {
        const isLatest = index === 0;
        const date = new Date(entry.changedAt);

        return (
          <div key={entry.version} className="relative mb-8 last:mb-0">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[33px] w-3 h-3 rounded-full ${
                isLatest
                  ? "bg-blue-500 ring-2 ring-blue-500"
                  : "bg-gray-400"
              }`}
            />

            {/* Content */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="font-mono font-semibold text-gray-900">
                  {entry.version}
                </span>
                <StatusBadge status={entry.status} />
              </div>

              <p className="text-sm text-gray-500">
                {date.toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>

              <p className="text-sm text-gray-700">{entry.summary}</p>

              <p className="text-xs text-gray-400 font-mono">
                {entry.gitCommit}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
