import React from "react";
import type { Status, Priority, Complexity } from "@reqord/shared";

const STATUS_STYLES: Record<Status, string> = {
  draft: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-300",
  approved: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  implemented: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  deprecated: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
};

const STATUS_LABELS: Record<Status, string> = {
  draft: "Draft",
  approved: "Approved",
  implemented: "Implemented",
  deprecated: "Deprecated",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const COMPLEXITY_STYLES: Record<Complexity, string> = {
  small: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  large: "bg-orange-100 text-orange-700",
  xlarge: "bg-red-100 text-red-700",
};

const COMPLEXITY_LABELS: Record<Complexity, string> = {
  small: "S",
  medium: "M",
  large: "L",
  xlarge: "XL",
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge className={PRIORITY_STYLES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}

export function ComplexityBadge({ complexity }: { complexity: Complexity }) {
  return <Badge className={COMPLEXITY_STYLES[complexity]}>{COMPLEXITY_LABELS[complexity]}</Badge>;
}
