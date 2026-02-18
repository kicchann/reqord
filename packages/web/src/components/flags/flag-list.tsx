import React from "react";
import type { Flag } from "@reqord/shared";
import { FlagBadge } from "./flag-badge";

export function FlagList({ flags }: { flags: Flag[] }) {
  if (flags.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4" data-testid="flag-list">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        Flags ({flags.length})
      </h2>
      <div className="space-y-3">
        {flags.map((flag, i) => (
          <div
            key={i}
            className="rounded-md border border-gray-100 bg-gray-50 p-3"
            data-testid="flag-item"
          >
            <div className="flex items-center gap-2">
              <FlagBadge
                type={flag.type}
                severity={flag.type === "feedback-review" ? flag.severity : undefined}
              />
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{flag.reason}</p>

            {flag.type === "feedback-review" && flag.relatedIssues.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                関連Issue:{" "}
                {flag.relatedIssues.map((n) => (
                  <span key={n} className="mr-1 font-mono text-blue-600" data-testid="related-issue">
                    #{n}
                  </span>
                ))}
              </p>
            )}

            {flag.type === "breaking-change" && flag.affectedVersions && flag.affectedVersions.length > 0 && (
              <p className="mt-1 text-xs text-gray-500" data-testid="affected-versions">
                影響バージョン: {flag.affectedVersions.join(", ")}
              </p>
            )}

            <p className="mt-1 text-xs text-gray-400">
              {new Date(flag.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
