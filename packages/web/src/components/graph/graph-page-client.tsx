"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { Requirement, Specification } from "@reqord/shared";
import { GraphModeSelector, type GraphMode } from "./graph-mode-selector";
import { buildMultiLevelGraphData } from "@/lib/graph-data";

const DependencyGraph = dynamic(
  () => import("./dependency-graph").then((mod) => mod.DependencyGraph),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 rounded-lg bg-gray-200" />
    ),
  }
);

const MultiLevelGraph = dynamic(
  () => import("./multi-level-graph").then((mod) => mod.MultiLevelGraph),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse h-96 rounded-lg bg-gray-200" />
    ),
  }
);

type GraphPageClientProps = {
  requirements: Requirement[];
  specifications: Specification[];
  specCountMap: Record<string, number>;
};

export function GraphPageClient({
  requirements,
  specifications,
  specCountMap,
}: GraphPageClientProps) {
  const [mode, setMode] = useState<GraphMode>("requirements");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dependency Graph</h1>
        <GraphModeSelector mode={mode} onModeChange={setMode} />
      </div>
      {mode === "requirements" ? (
        <DependencyGraph requirements={requirements} specCountMap={specCountMap} />
      ) : (
        <MultiLevelGraph
          data={buildMultiLevelGraphData(requirements, specifications)}
        />
      )}
    </div>
  );
}
