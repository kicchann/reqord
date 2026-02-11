"use client";

import React, { useEffect } from "react";

interface DrillDownBreadcrumbProps {
  requirementTitle: string;
  onBack: () => void;
}

export function DrillDownBreadcrumb({ requirementTitle, onBack }: DrillDownBreadcrumbProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
      <button
        onClick={onBack}
        className="flex items-center gap-1 rounded px-3 py-1 hover:bg-gray-100"
      >
        ← Back to overview
      </button>
      <span className="text-gray-400">/</span>
      <span className="font-medium text-gray-900">{requirementTitle}</span>
      <span className="ml-auto text-xs text-gray-400">(Press Esc to go back)</span>
    </div>
  );
}
