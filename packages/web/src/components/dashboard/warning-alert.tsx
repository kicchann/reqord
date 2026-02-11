import React from "react";
import type { Warning } from "@/lib/dashboard-data";

type WarningAlertProps = {
  warning: Warning;
};

export function WarningAlert({ warning }: WarningAlertProps) {
  let borderColor = "border-blue-500";
  let bgColor = "bg-blue-50";

  if (warning.severity === "error") {
    borderColor = "border-red-500";
    bgColor = "bg-red-50";
  } else if (warning.severity === "warning") {
    borderColor = "border-yellow-500";
    bgColor = "bg-yellow-50";
  }

  return (
    <div
      data-testid="warning-alert"
      className={`rounded-md border-l-4 p-4 ${borderColor} ${bgColor}`}
    >
      <div className="flex items-start">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{warning.message}</p>
          <p className="mt-1 text-xs text-gray-600">{warning.relatedId}</p>
        </div>
      </div>
    </div>
  );
}
