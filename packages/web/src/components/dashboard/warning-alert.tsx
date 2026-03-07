import React from "react";
import type { Warning } from "@/lib/dashboard-data";

type WarningAlertProps = {
  warning: Warning;
};

function ErrorIcon() {
  return (
    <svg
      className="h-5 w-5 text-red-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      className="h-5 w-5 text-yellow-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="h-5 w-5 text-blue-500"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function WarningAlert({ warning }: WarningAlertProps) {
  let bgColor = "bg-blue-50";
  let icon = <InfoIcon />;

  if (warning.severity === "error") {
    bgColor = "bg-red-50";
    icon = <ErrorIcon />;
  } else if (warning.severity === "warning") {
    bgColor = "bg-yellow-50";
    icon = <WarningIcon />;
  }

  return (
    <div
      data-testid="warning-alert"
      className={`rounded-lg p-4 ${bgColor}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 pt-0.5">{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{warning.message}</p>
          <p className="mt-1 text-xs text-gray-600">{warning.relatedId}</p>
        </div>
      </div>
    </div>
  );
}
