import React from "react";

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-gray-400 text-white",
};

const TYPE_STYLES: Record<string, { bg: string; label: string }> = {
  bug: { bg: "bg-red-100 text-red-800", label: "Bug" },
  improvement: { bg: "bg-blue-100 text-blue-800", label: "Improvement" },
  "requirement-gap": { bg: "bg-amber-100 text-amber-800", label: "Requirement Gap" },
  "spec-mismatch": { bg: "bg-purple-100 text-purple-800", label: "Spec Mismatch" },
  security: { bg: "bg-red-100 text-red-800", label: "Security" },
};

export function FeedbackBadge({
  type,
  severity,
}: {
  type?: string;
  severity?: string;
}) {
  const typeStyle = type ? TYPE_STYLES[type] : undefined;
  const severityStyle = severity ? SEVERITY_STYLES[severity] : undefined;

  return (
    <span className="inline-flex items-center gap-1.5">
      {typeStyle && (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeStyle.bg}`}
          data-testid={`feedback-badge-${type}`}
        >
          {typeStyle.label}
        </span>
      )}
      {severityStyle && (
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${severityStyle}`}
          data-testid="feedback-severity"
        >
          {severity}
        </span>
      )}
    </span>
  );
}
