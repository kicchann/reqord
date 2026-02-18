import React from "react";

type FlagType = "feedback-review" | "security-review" | "breaking-change";

const TYPE_STYLES: Record<FlagType, { bg: string; label: string }> = {
  "feedback-review": { bg: "bg-amber-100 text-amber-800", label: "Feedback Review" },
  "security-review": { bg: "bg-red-100 text-red-800", label: "Security Review" },
  "breaking-change": { bg: "bg-purple-100 text-purple-800", label: "Breaking Change" },
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-yellow-500 text-white",
  low: "bg-gray-400 text-white",
};

export function FlagBadge({
  type,
  severity,
}: {
  type: FlagType;
  severity?: string;
}) {
  const style = TYPE_STYLES[type] ?? TYPE_STYLES["feedback-review"];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}
        data-testid={`flag-badge-${type}`}
      >
        {style.label}
      </span>
      {severity && (
        <span
          className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low}`}
          data-testid="flag-severity"
        >
          {severity}
        </span>
      )}
    </span>
  );
}
