import React from "react";
import { WarningAlert } from "./warning-alert";
import type { Warning } from "@/lib/dashboard-data";

type WarningAlertsProps = {
  warnings: Warning[];
};

export function WarningAlerts({ warnings }: WarningAlertsProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Warnings</h2>
      <div className="space-y-3">
        {warnings.map((warning, index) => (
          <WarningAlert key={index} warning={warning} />
        ))}
      </div>
    </div>
  );
}
