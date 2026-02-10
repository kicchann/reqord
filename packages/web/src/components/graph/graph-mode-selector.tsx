"use client";

import React from "react";

export type GraphMode = "requirements" | "full";

type GraphModeSelectorProps = {
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
};

export function GraphModeSelector({
  mode,
  onModeChange,
}: GraphModeSelectorProps) {
  const handleClick = (newMode: GraphMode) => {
    if (newMode !== mode) {
      onModeChange(newMode);
    }
  };

  const getButtonClasses = (buttonMode: GraphMode) => {
    const isActive = mode === buttonMode;
    const baseClasses =
      "px-4 py-2 text-sm font-medium transition-colors duration-200";
    const activeClasses = "bg-blue-600 text-white";
    const inactiveClasses = "bg-white text-gray-700 hover:bg-gray-50";

    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;
  };

  return (
    <div className="inline-flex rounded-full border border-gray-300 overflow-hidden shadow-sm">
      <button
        type="button"
        className={getButtonClasses("requirements")}
        onClick={() => handleClick("requirements")}
      >
        Requirements Only
      </button>
      <button
        type="button"
        className={getButtonClasses("full")}
        onClick={() => handleClick("full")}
      >
        Full Traceability
      </button>
    </div>
  );
}
