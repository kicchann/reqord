"use client";

import React from "react";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackLinkedItems } from "./feedback-linked-items";

const TYPE_STYLES: Record<string, string> = {
  bug: "bg-red-100 text-red-800",
  improvement: "bg-blue-100 text-blue-800",
  "requirement-gap": "bg-yellow-100 text-yellow-800",
  "spec-mismatch": "bg-orange-100 text-orange-800",
  security: "bg-red-200 text-red-900",
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-gray-400 text-white",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-600",
};

export function FeedbackTable({
  feedbacks,
  requirementTitles,
  specificationTitles,
}: {
  feedbacks: FeedbackEntry[];
  requirementTitles: Record<string, string>;
  specificationTitles: Record<string, string>;
}) {
  if (feedbacks.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500" data-testid="feedback-empty">
        No feedback found.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white" data-testid="feedback-table">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Title</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Severity</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Linked</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Synced</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {feedbacks.map((fb) => (
            <tr key={fb.githubIssue} data-testid="feedback-row">
              <td className="whitespace-nowrap px-4 py-3">
                <span className="font-mono text-sm text-blue-600" data-testid="feedback-issue">
                  #{fb.githubIssue}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="max-w-xs truncate text-sm text-gray-900" data-testid="feedback-title">
                  {fb.title ?? "-"}
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {fb.type && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[fb.type] ?? ""}`}
                    data-testid="feedback-type-badge"
                  >
                    {fb.type}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {fb.severity && (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[fb.severity] ?? ""}`}
                    data-testid="feedback-severity-badge"
                  >
                    {fb.severity}
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[fb.status] ?? ""}`}
                  data-testid="feedback-status-badge"
                >
                  {fb.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <FeedbackLinkedItems
                  linkedTo={fb.linkedTo}
                  requirementTitles={requirementTitles}
                  specificationTitles={specificationTitles}
                />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                {new Date(fb.syncedAt).toLocaleDateString("ja-JP")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
