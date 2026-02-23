import React from "react";
import type { FeedbackEntry } from "@reqord/shared";
import { FeedbackBadge } from "./feedback-badge";

export function FeedbackList({ feedbacks }: { feedbacks: FeedbackEntry[] }) {
  if (feedbacks.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4" data-testid="feedback-list">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Unresolved Feedback ({feedbacks.length})
      </h2>
      <div className="space-y-3">
        {feedbacks.map((feedback) => (
          <div
            key={feedback.githubIssue}
            className="rounded-md border border-gray-100 bg-gray-50 p-3"
            data-testid="feedback-item"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 font-mono text-sm text-blue-600" data-testid="feedback-issue">
                #{feedback.githubIssue}
              </span>
              {feedback.title && (
                <span className="truncate text-sm text-gray-700" data-testid="feedback-title">{feedback.title}</span>
              )}
              <FeedbackBadge
                type={feedback.type}
                severity={feedback.severity}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {new Date(feedback.syncedAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
